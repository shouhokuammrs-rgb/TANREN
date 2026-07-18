// DB層テスト: ログ削除後の再計算(ISS-008)とボリューム集計(ISS-012)
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { dailyVolumeHistory, deleteSession, loadEngineContext, weeklyVolumeHistory } from './queries'
import { generateMenu } from '../engine'

async function clearLogs() {
  await db.sets.clear()
  await db.session_exercises.clear()
  await db.sessions.clear()
}

/** 指定種目1種目・完了セット付きの完了セッションを作る(whenは日数遡り or 開始日時) */
async function createCompletedSession(
  exerciseName: string,
  when: number | Date,
  weightKg: number,
  opts: { reps?: number; setCount?: number } = {},
): Promise<number> {
  const exercise = (await db.exercises.toArray()).find((e) => e.name === exerciseName)
  if (!exercise) throw new Error(`exercise not found: ${exerciseName}`)
  const startedAt = when instanceof Date ? when : new Date(Date.now() - when * 24 * 3_600_000)
  const sessionId = (await db.sessions.add({
    startedAt,
    endedAt: new Date(startedAt.getTime() + 45 * 60_000),
    status: 'completed',
    muscles: [exercise.primaryMuscle],
  })) as number
  const sessionExerciseId = (await db.session_exercises.add({
    sessionId,
    exerciseId: exercise.id!,
    order: 0,
  })) as number
  const setCount = opts.setCount ?? 3
  for (let i = 1; i <= setCount; i++) {
    await db.sets.add({
      sessionExerciseId,
      setNumber: i,
      suggestedWeightKg: weightKg,
      suggestedReps: opts.reps ?? 8,
      actualWeightKg: weightKg,
      actualReps: opts.reps ?? 8,
      achieved: true,
      completedAt: new Date(startedAt.getTime() + i * 5 * 60_000),
    })
  }
  return sessionId
}

const BENCH = 'ダンベルベンチプレス'

describe('deleteSession(ISS-008)', () => {
  beforeEach(async () => {
    await db.open()
    await clearLogs()
  })

  it('セッション・種目・セットが関連レコードごと消える', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 13)
    await deleteSession(sessionId)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.session_exercises.count()).toBe(0)
    expect(await db.sets.count()).toBe(0)
  })

  it('最新ログを削除すると前回重量参照が残存ログに戻る', async () => {
    const exercise = (await db.exercises.toArray()).find((e) => e.name === BENCH)!
    await createCompletedSession(BENCH, 10, 10)
    const newer = await createCompletedSession(BENCH, 1, 14.5)

    const before = await loadEngineContext()
    expect(before.lastPerformance.get(exercise.id!)?.sets[0].weightKg).toBe(14.5)

    await deleteSession(newer)
    const after = await loadEngineContext()
    expect(after.lastPerformance.get(exercise.id!)?.sets[0].weightKg).toBe(10)
  })

  it('削除でフレッシュネス(部位の直近刺激)も残存ログから再計算される', async () => {
    await createCompletedSession(BENCH, 10, 10)
    const newer = await createCompletedSession(BENCH, 0, 14.5)

    const before = await loadEngineContext()
    const stimulusBefore = before.muscleStimuli.find((s) => s.muscle === 'chest')!
    await deleteSession(newer)
    const after = await loadEngineContext()
    const stimulusAfter = after.muscleStimuli.find((s) => s.muscle === 'chest')!
    expect(stimulusAfter.at.getTime()).toBeLessThan(stimulusBefore.at.getTime())
  })

  it('全ログ削除後もメニュー生成が正常(初期重量提案に戻る)', async () => {
    const first = await createCompletedSession(BENCH, 1, 14.5)
    await deleteSession(first)

    const ctx = await loadEngineContext()
    expect(ctx.lastPerformance.size).toBe(0)
    const menu = generateMenu(ctx, {
      availableMinutes: 45,
      targetMuscles: ['chest'],
      condition: 'normal',
    })
    expect(menu.items.length).toBeGreaterThan(0)
    for (const item of menu.items) {
      if (item.suggestedWeightKg !== undefined) {
        expect(ctx.dumbbellStepsKg).toContain(item.suggestedWeightKg)
      }
    }
  })
})

describe('ボリューム集計(ISS-012): 週別/日別履歴', () => {
  // 2026-07-13(月)が今週の開始。7/12(日)は前週=7/6週に入る
  const now = new Date('2026-07-17T12:00:00')

  beforeEach(async () => {
    await db.open()
    await clearLogs()
  })

  it('週跨ぎ: 日曜(7/12)と月曜(7/13)のトレは別の週バケットに集計される', async () => {
    await createCompletedSession(BENCH, new Date('2026-07-12T10:00:00'), 13)
    await createCompletedSession(BENCH, new Date('2026-07-13T10:00:00'), 13)
    const points = await weeklyVolumeHistory(8, now)
    const prevWeek = points.find((p) => p.weekLabel === '7/6週')
    const currWeek = points.find((p) => p.weekLabel === '7/13週')
    expect(prevWeek?.sets.chest).toBe(3)
    expect(currWeek?.sets.chest).toBe(3)
  })

  it('週別のx軸ラベルは「M/D週」形式で週集計を明示する', async () => {
    const points = await weeklyVolumeHistory(2, now)
    expect(points.map((p) => p.weekLabel)).toEqual(['7/6週', '7/13週'])
  })

  it('日別: 直近14日でトレなしの日も空点として含まれる(連続性)', async () => {
    await createCompletedSession(BENCH, new Date('2026-07-09T10:00:00'), 13)
    await createCompletedSession(BENCH, new Date('2026-07-13T10:00:00'), 13)
    const points = await dailyVolumeHistory(14, now)
    expect(points).toHaveLength(14)
    expect(points[0].weekLabel).toBe('7/4')
    expect(points[13].weekLabel).toBe('7/17')
    // 7/9と7/13が別の点として立つ(受け入れ条件)
    expect(points.find((p) => p.weekLabel === '7/9')?.sets.chest).toBe(3)
    expect(points.find((p) => p.weekLabel === '7/13')?.sets.chest).toBe(3)
    // 間のトレなし日は空
    expect(points.find((p) => p.weekLabel === '7/10')?.sets).toEqual({})
  })

  it('日別: 集計範囲より古い記録は含まれない', async () => {
    await createCompletedSession(BENCH, new Date('2026-07-01T10:00:00'), 13)
    const points = await dailyVolumeHistory(14, now)
    expect(points.every((p) => Object.keys(p.sets).length === 0)).toBe(true)
  })
})
