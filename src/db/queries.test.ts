// DB層テスト: ログ削除後の再計算(ISS-008)・ボリューム集計(ISS-012)・ゴール判定記録(Phase 7-5b)
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  dailyVolumeHistory,
  deleteSession,
  judgeGoal,
  loadEngineContext,
  recordReachedGoals,
  resumeMuscleGoal,
  weeklyVolumeHistory,
} from './queries'
import { GOAL_COEF } from '../constants/goals'
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

describe('recentEmphasis(DEC-012): 部位ごとの直近セッションの強調区分', () => {
  beforeEach(async () => {
    await db.open()
    await clearLogs()
  })

  it('直近3セッション分の強調を新しい順で返す(それ以前は落ちる)', async () => {
    await createCompletedSession(BENCH, 8, 11.5) // mid(4セッション目=対象外)
    await createCompletedSession('インクラインダンベルプレス', 6, 10) // upper
    await createCompletedSession(BENCH, 4, 13) // mid
    await createCompletedSession('デクラインダンベルプレス', 1, 11.5) // lower(最新)

    const ctx = await loadEngineContext()
    expect(ctx.recentEmphasis?.get('chest')).toEqual(['lower', 'mid', 'upper'])
  })

  it('中立種目しかない部位は空のまま(背中の回帰)', async () => {
    await createCompletedSession('ワンハンドダンベルロウ', 1, 13)
    const ctx = await loadEngineContext()
    expect(ctx.recentEmphasis?.get('back')).toBeUndefined()
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

describe('ゴール到達検知と鏡チェックの判定記録(Phase 7-5b)', () => {
  beforeEach(async () => {
    await db.open()
    await clearLogs()
    await db.muscle_goals.clear()
    await db.goal_events.clear()
    await db.profiles.clear()
    await db.profiles.add({
      heightCm: 170,
      weightKg: 58,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  /** 体重58kg・目標18kg(係数18/58)の胸growthゴールを作る */
  async function seedChestGoal(overrides: Partial<Parameters<typeof db.muscle_goals.add>[0]> = {}) {
    await db.muscle_goals.add({
      muscle: 'chest',
      level: 'toned',
      coef: 18 / 58,
      mode: 'growth',
      updatedAt: new Date(),
      ...overrides,
    })
  }

  it('到達検知: reachedAtが立ちgoal_eventsにreachedが記録される。判定未消化の再到達は重複記録しない', async () => {
    await seedChestGoal()
    // ベンチ14.5kg×8 → e1RM 14.5×(1+8/30)≒18.4 ≧ 目標18
    const first = await createCompletedSession(BENCH, 1, 14.5)
    expect(await recordReachedGoals(first)).toEqual(['chest'])
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeDefined()
    expect(await db.goal_events.where('muscle').equals('chest').count()).toBe(1)

    // 判定未消化のまま再到達 → 検知・記録なし
    const second = await createCompletedSession(BENCH, 0, 14.5)
    expect(await recordReachedGoals(second)).toEqual([])
    expect(await db.goal_events.count()).toBe(1)
  })

  it('到達未満・記録していない部位では検知しない', async () => {
    await seedChestGoal({ coef: 25 / 58 }) // 目標25 > e1RM18.4
    const sessionId = await createCompletedSession(BENCH, 1, 14.5)
    expect(await recordReachedGoals(sessionId)).toEqual([])
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeUndefined()
  })

  it('判定「満足」: mode=maintainへ+reachedAtクリア+maintainイベント', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await judgeGoal('chest', 'maintain')
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.mode).toBe('maintain')
    expect(goal?.reachedAt).toBeUndefined()
    expect((await db.goal_events.toArray()).map((e) => e.type)).toEqual(['maintain'])
  })

  it('判定「物足りない」: レベル1段引き上げ(プリセット係数)+raiseイベント', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await judgeGoal('chest', 'raise')
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.level).toBe('solid')
    expect(goal?.coef).toBe(GOAL_COEF.chest.solid)
    expect(goal?.reachedAt).toBeUndefined()
    expect((await db.goal_events.toArray()).map((e) => e.type)).toEqual(['raise'])
  })

  it('big到達で物足りない: 直接編集kg(+10%提案)を係数化して保存+noteに記録', async () => {
    await seedChestGoal({ level: 'big', coef: GOAL_COEF.chest.big, reachedAt: new Date() })
    await judgeGoal('chest', 'raise', 32)
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.level).toBe('big') // レベルはbigのまま(Elite係数は採用しない・DEC-013)
    expect(goal?.coef).toBeCloseTo(32 / 58, 5)
    const events = await db.goal_events.toArray()
    expect(events[0].type).toBe('raise')
    expect(events[0].note).toContain('32kg')
  })

  it('維持からの復帰: mode=growthへ戻り+resumeイベント', async () => {
    await seedChestGoal({ mode: 'maintain' })
    await resumeMuscleGoal('chest', { level: 'solid', coef: GOAL_COEF.chest.solid })
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.mode).toBe('growth')
    expect(goal?.level).toBe('solid')
    expect((await db.goal_events.toArray()).map((e) => e.type)).toEqual(['resume'])
  })
})
