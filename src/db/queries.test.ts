// ログ削除(ISS-008)後にエンジンが残存ログから正しく再計算されることのDB層テスト
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { deleteSession, loadEngineContext } from './queries'
import { generateMenu } from '../engine'

async function clearLogs() {
  await db.sets.clear()
  await db.session_exercises.clear()
  await db.sessions.clear()
}

/** 指定種目1種目・完了セット付きの完了セッションを作る */
async function createCompletedSession(
  exerciseName: string,
  daysAgo: number,
  weightKg: number,
  opts: { reps?: number; setCount?: number } = {},
): Promise<number> {
  const exercise = (await db.exercises.toArray()).find((e) => e.name === exerciseName)
  if (!exercise) throw new Error(`exercise not found: ${exerciseName}`)
  const startedAt = new Date(Date.now() - daysAgo * 24 * 3_600_000)
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
