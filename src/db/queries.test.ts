// DB層テスト: ログ削除後の再計算(ISS-008)・ボリューム集計(ISS-012)・ゴール判定記録(Phase 7-5b)
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  acceptPromotion,
  addLoggedSet,
  dailyVolumeHistory,
  deleteLoggedSet,
  deleteSession,
  finishSession,
  judgeGoal,
  listClearedAbsConditions,
  loadEngineContext,
  loadGrowthSessions,
  loadPromotionProposal,
  recordAbsProgress,
  recordReachedGoals,
  resumeMuscleGoal,
  saveAbsGoal,
  saveMuscleGoal,
  updateLoggedSet,
  weeklyVolumeHistory,
} from './queries'
import { CLOUD_PENDING_KEY } from '../constants/cloud'
import { GOAL_COEF } from '../constants/goals'
import { generateMenu, goalTrendByMuscle } from '../engine'

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

  // ===== QA追加(Phase 7-5b): 異常系・省略引数の防御 =====

  it('judgeGoal: ゴール未設定部位ではno-op(イベントを記録しない)', async () => {
    await judgeGoal('shoulders', 'maintain')
    await judgeGoal('shoulders', 'raise')
    expect(await db.goal_events.count()).toBe(0)
    expect(await db.muscle_goals.count()).toBe(0)
  })

  it('resumeMuscleGoal: patch省略時はレベル・係数を維持したままgrowthへ戻る', async () => {
    await seedChestGoal({ mode: 'maintain', level: 'solid', coef: GOAL_COEF.chest.solid })
    await resumeMuscleGoal('chest')
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.mode).toBe('growth')
    expect(goal?.level).toBe('solid')
    expect(goal?.coef).toBe(GOAL_COEF.chest.solid)
  })

  // ===== ISS-019(QA-1): 保存時のreachedAt再評価(PM裁定) =====

  it('ISS-019: 現在e1RM≥新目標のまま保存 → reachedAtを引き継ぐ(状態4維持・イベントなし)', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await createCompletedSession(BENCH, 1, 14.5) // e1RM≒18.4 ≥ 目標18
    await saveMuscleGoal({ muscle: 'chest', level: 'toned', coef: 18 / 58, mode: 'growth' })
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeDefined()
    expect(await db.goal_events.count()).toBe(0)
  })

  it('ISS-019: 新目標が現在e1RMを上回る保存 → reachedAtをクリア(goal_events記録なし)', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await createCompletedSession(BENCH, 1, 14.5) // e1RM≒18.4 < 新目標25
    await saveMuscleGoal({ muscle: 'chest', level: 'solid', coef: 25 / 58, mode: 'growth' })
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.reachedAt).toBeUndefined()
    expect(goal?.coef).toBeCloseTo(25 / 58, 5)
    expect(await db.goal_events.count()).toBe(0)
  })

  it('ISS-019: 現在e1RMが導出できない部位(実ログなし)はクリア側に倒す', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await saveMuscleGoal({ muscle: 'chest', level: 'toned', coef: 18 / 58, mode: 'growth' })
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeUndefined()
  })

  // ===== DEC-016 §5(PM裁定採用): 保存時の即到達 =====

  it('DEC-016: 既超過部位への設定は保存時に即到達(reachedAt+reachedイベント)', async () => {
    await createCompletedSession(BENCH, 1, 14.5) // e1RM≒18.4
    // ひかえめ(0.20×58=11.6)は既に超えている → 保存で即状態4
    await saveMuscleGoal({ muscle: 'chest', level: 'light', coef: GOAL_COEF.chest.light, mode: 'growth' })
    const goal = await db.muscle_goals.get('chest')
    expect(goal?.reachedAt).toBeInstanceOf(Date)
    expect((await db.goal_events.toArray()).map((e) => e.type)).toEqual(['reached'])
  })

  it('DEC-016: 重複抑止 — reachedAt保持中の再保存では2つ目のreachedを記録しない', async () => {
    await createCompletedSession(BENCH, 1, 14.5)
    await saveMuscleGoal({ muscle: 'chest', level: 'light', coef: GOAL_COEF.chest.light, mode: 'growth' })
    await saveMuscleGoal({ muscle: 'chest', level: 'light', coef: GOAL_COEF.chest.light, mode: 'growth' })
    expect(await db.goal_events.count()).toBe(1)
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeInstanceOf(Date)
  })

  it('DEC-016: 未到達目標・maintainモードの保存では即到達しない', async () => {
    await createCompletedSession(BENCH, 1, 14.5)
    await saveMuscleGoal({ muscle: 'chest', level: 'big', coef: GOAL_COEF.chest.big, mode: 'growth' }) // 目標40.6
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeUndefined()
    await saveMuscleGoal({ muscle: 'back', level: 'light', coef: GOAL_COEF.back.light, mode: 'maintain' })
    expect((await db.muscle_goals.get('back'))?.reachedAt).toBeUndefined()
    expect(await db.goal_events.count()).toBe(0)
  })

  it('ISS-019×DEC-016: 目標引き上げでクリア(イベントなし)→下げ直すと保存時に正規reachedで再到達', async () => {
    await seedChestGoal({ reachedAt: new Date() })
    await createCompletedSession(BENCH, 1, 14.5)
    // 目標引き上げ保存で状態4クリア(goal_events記録なし・ISS-019裁定)
    await saveMuscleGoal({ muscle: 'chest', level: 'solid', coef: 25 / 58, mode: 'growth' })
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeUndefined()
    expect(await db.goal_events.count()).toBe(0)
    // 目標を現在以下へ戻すと保存時の即到達(DEC-016 §5)が新目標への正規reachedとして記録する
    await saveMuscleGoal({ muscle: 'chest', level: 'toned', coef: 18 / 58, mode: 'growth' })
    expect((await db.muscle_goals.get('chest'))?.reachedAt).toBeInstanceOf(Date)
    expect((await db.goal_events.toArray()).map((e) => e.type)).toEqual(['reached'])
  })
})

describe('ログの事後編集(ISS-020)', () => {
  beforeEach(async () => {
    await db.open()
    await clearLogs()
    await db.settings.clear()
  })

  async function firstEntry(sessionId: number) {
    const se = (await db.session_exercises.where('sessionId').equals(sessionId).toArray())[0]
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('setNumber')
    return { se, sets }
  }

  it('セット編集: weightは0.5kg刻みに丸め・achievedは記録時と同じ規則で再判定・編集済みマーク', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 11.5) // 提案11.5kg×8
    const { sets } = await firstEntry(sessionId)

    await updateLoggedSet(sets[0].id!, { weightKg: 13.3, reps: 10 })
    const edited = (await db.sets.get(sets[0].id!))!
    expect(edited.actualWeightKg).toBe(13.5) // 13.3 → 0.5刻み丸め
    expect(edited.actualReps).toBe(10)
    expect(edited.achieved).toBe(true) // 13.5≥11.5 かつ 10≥8

    // 提案未満に下げたらachieved=false
    await updateLoggedSet(sets[1].id!, { weightKg: 11.5, reps: 5 })
    expect((await db.sets.get(sets[1].id!))?.achieved).toBe(false)

    // 編集済みマーク(updatedAt)+クラウド再アップロード対象
    expect((await db.sessions.get(sessionId))?.updatedAt).toBeInstanceOf(Date)
    const pending = await db.settings.get(CLOUD_PENDING_KEY)
    expect(pending?.value).toBe(true)
  })

  it('セット編集: reps0以下・weight0以下は無視(no-op)', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 11.5)
    const { sets } = await firstEntry(sessionId)
    await updateLoggedSet(sets[0].id!, { weightKg: 11.5, reps: 0 })
    await updateLoggedSet(sets[0].id!, { weightKg: 0, reps: 8 })
    const set = (await db.sets.get(sets[0].id!))!
    expect(set.actualWeightKg).toBe(11.5)
    expect(set.actualReps).toBe(8)
    expect((await db.sessions.get(sessionId))?.updatedAt).toBeUndefined()
  })

  it('自重セット(weightなし)はrepsのみ編集できweightはundefinedのまま', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 11.5)
    const { sets } = await firstEntry(sessionId)
    // 自重相当のセットを用意(weight実績なし)
    await db.sets.update(sets[0].id!, { actualWeightKg: undefined, suggestedWeightKg: undefined })
    await updateLoggedSet(sets[0].id!, { reps: 15 })
    const set = (await db.sets.get(sets[0].id!))!
    expect(set.actualWeightKg).toBeUndefined()
    expect(set.actualReps).toBe(15)
  })

  it('セット追加: 直近の完了セットを複製して末尾に追加(完了扱い・setNumber連番)', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 13)
    const { se } = await firstEntry(sessionId)
    const newId = await addLoggedSet(se.id!)
    expect(newId).toBeDefined()
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('setNumber')
    expect(sets).toHaveLength(4)
    const added = sets[3]
    expect(added.setNumber).toBe(4)
    expect(added.actualWeightKg).toBe(13)
    expect(added.actualReps).toBe(8)
    expect(added.completedAt).toBeInstanceOf(Date)
  })

  it('セット削除: 残りのsetNumberが1から詰め直される', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 13)
    const { se, sets } = await firstEntry(sessionId)
    const result = await deleteLoggedSet(sets[1].id!) // 2番目を削除
    expect(result.exerciseRemoved).toBe(false)
    const rest = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('setNumber')
    expect(rest.map((s) => s.setNumber)).toEqual([1, 2])
  })

  it('最後の1セットを削除すると種目記録ごと消える', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 13, { setCount: 1 })
    const { se, sets } = await firstEntry(sessionId)
    const result = await deleteLoggedSet(sets[0].id!)
    expect(result.exerciseRemoved).toBe(true)
    expect(await db.session_exercises.get(se.id!)).toBeUndefined()
    expect(await db.sets.where('sessionExerciseId').equals(se.id!).count()).toBe(0)
  })

  it('派生値反映: 編集後の値で成長点列・現在e1RMが再計算される(再計算コードなしの自動反映)', async () => {
    const sessionId = await createCompletedSession(BENCH, 1, 14.5) // e1RM 14.5×(1+8/30)≒18.4
    const before = goalTrendByMuscle(await loadGrowthSessions(), new Date()).chest?.currentE1Rm
    expect(before).toBeCloseTo(14.5 * (1 + 8 / 30), 5)

    const { sets } = await firstEntry(sessionId)
    for (const s of sets) await updateLoggedSet(s.id!, { weightKg: 16, reps: 10 })
    const after = goalTrendByMuscle(await loadGrowthSessions(), new Date()).chest?.currentE1Rm
    expect(after).toBeCloseTo(16 * (1 + 10 / 30), 5)
  })
})

describe('腹の段位型ゴール+加重昇格(DEC-017改/018改)', () => {
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
    // 昇格状態をリセット(acceptPromotionがマスタを書き換えるため)
    const exercises = await db.exercises.toArray()
    const crunch = exercises.find((e) => e.name === 'クランチ')!
    const dbCrunch = exercises.find((e) => e.name === 'ダンベルクランチ')!
    await db.exercises.update(crunch.id!, { isActive: 1 })
    await db.exercises.update(dbCrunch.id!, { isActive: 0 })
  })

  /** 自重/加重種目の完了セッション(3セット)。repsは全セット同値 */
  async function createAbsSession(
    exerciseName: string,
    opts: { reps: number; achieved?: boolean; atFailure?: boolean; weightKg?: number },
  ): Promise<number> {
    const exercise = (await db.exercises.toArray()).find((e) => e.name === exerciseName)!
    const startedAt = new Date()
    const sessionId = (await db.sessions.add({
      startedAt,
      endedAt: new Date(startedAt.getTime() + 30 * 60_000),
      status: 'completed',
      muscles: ['abs'],
    })) as number
    const sessionExerciseId = (await db.session_exercises.add({
      sessionId,
      exerciseId: exercise.id!,
      order: 0,
    })) as number
    for (let i = 1; i <= 3; i++) {
      await db.sets.add({
        sessionExerciseId,
        setNumber: i,
        suggestedReps: exercise.repRangeMax,
        suggestedWeightKg: opts.weightKg,
        actualWeightKg: opts.weightKg,
        actualReps: opts.reps,
        achieved: opts.achieved ?? true,
        atFailure: opts.atFailure || undefined,
        completedAt: new Date(startedAt.getTime() + i * 3 * 60_000),
      })
    }
    return sessionId
  }

  it('条件クリアの永続保存: クランチ上限完遂でC1がgoal_eventsに記録され、再完遂で重複しない', async () => {
    const first = await createAbsSession('クランチ', { reps: 25 })
    expect(await recordAbsProgress(first)).toEqual(['C1'])
    expect([...(await listClearedAbsConditions())]).toEqual(['C1'])

    const second = await createAbsSession('クランチ', { reps: 25 })
    expect(await recordAbsProgress(second)).toEqual([])
    const events = await db.goal_events.where('muscle').equals('abs').toArray()
    expect(events.filter((e) => e.type === 'abs_condition')).toHaveLength(1)
  })

  it('上限未満・限界フラグ付きではクリアしない', async () => {
    const short = await createAbsSession('クランチ', { reps: 24 })
    expect(await recordAbsProgress(short)).toEqual([])
    const failure = await createAbsSession('クランチ', { reps: 25, atFailure: true })
    expect(await recordAbsProgress(failure)).toEqual([])
    expect((await listClearedAbsConditions()).size).toBe(0)
  })

  it('順不同の積み上げ: C2(レッグレイズ)が先でも引き締め到達→C1追加でしっかり到達', async () => {
    await saveAbsGoal('toned', 'growth')
    const legRaise = await createAbsSession('レッグレイズ', { reps: 20 })
    await recordAbsProgress(legRaise)
    let goal = await db.muscle_goals.get('abs')
    expect(goal?.reachedAt).toBeDefined() // C2のみで引き締め到達

    // 判定消化(維持へ)→ しっかりに引き上げて再開相当の保存
    await judgeGoal('abs', 'maintain')
    await saveAbsGoal('solid', 'growth')
    goal = await db.muscle_goals.get('abs')
    expect(goal?.reachedAt).toBeUndefined() // C1未クリアなのでしっかり未到達

    const crunch = await createAbsSession('クランチ', { reps: 25 })
    await recordAbsProgress(crunch)
    goal = await db.muscle_goals.get('abs')
    expect(goal?.reachedAt).toBeDefined() // C1+C2=しっかり到達
    expect([...(await listClearedAbsConditions())].sort()).toEqual(['C1', 'C2'])
  })

  it('永続性(PM裁定§6-4): 加重移行後もC1は落ちない', async () => {
    const crunch = await createAbsSession('クランチ', { reps: 25 })
    await recordAbsProgress(crunch)
    await acceptPromotion() // クランチ無効化=自重データは今後停止

    const legRaise = await createAbsSession('レッグレイズ', { reps: 12 })
    await recordAbsProgress(legRaise)
    expect([...(await listClearedAbsConditions())]).toEqual(['C1'])

    // クリア済み条件に基づき、後からのゴール設定でも即到達する
    await saveAbsGoal('toned', 'growth')
    expect((await db.muscle_goals.get('abs'))?.reachedAt).toBeDefined()
  })

  it('saveAbsGoal: 到達済み段位の選択は保存時に即到達(reachedイベント)・未達段位への変更でクリア', async () => {
    const crunch = await createAbsSession('クランチ', { reps: 25 })
    await recordAbsProgress(crunch) // C1

    await saveAbsGoal('toned', 'growth')
    let goal = await db.muscle_goals.get('abs')
    expect(goal?.reachedAt).toBeDefined()
    expect(goal?.coef).toBe(0)
    expect(
      (await db.goal_events.where('muscle').equals('abs').toArray()).filter(
        (e) => e.type === 'reached',
      ),
    ).toHaveLength(1)

    // ISS-019と同じ規則: 未達の上位段位へ変えたら状態4をクリア(イベントなし)
    await saveAbsGoal('big', 'growth')
    goal = await db.muscle_goals.get('abs')
    expect(goal?.reachedAt).toBeUndefined()
  })

  it('鏡チェック合流: 腹の「物足りない」は段位1段上げ(coef 0固定)・がっつりは上げ先なし', async () => {
    await db.muscle_goals.add({
      muscle: 'abs',
      level: 'toned',
      coef: 0,
      mode: 'growth',
      updatedAt: new Date(),
      reachedAt: new Date(),
    })
    await judgeGoal('abs', 'raise')
    let goal = await db.muscle_goals.get('abs')
    expect(goal?.level).toBe('solid')
    expect(goal?.coef).toBe(0)
    expect(goal?.reachedAt).toBeUndefined()

    await db.muscle_goals.update('abs', { level: 'big', reachedAt: new Date() })
    await judgeGoal('abs', 'raise')
    goal = await db.muscle_goals.get('abs')
    expect(goal?.level).toBe('big') // 変化なし(UI側はボタン非表示)
  })

  it('昇格提案: クランチ上限完遂セッションで発火・未完遂や受諾後は出ない', async () => {
    const short = await createAbsSession('クランチ', { reps: 20 })
    expect(await loadPromotionProposal(short)).toBeNull()

    const capped = await createAbsSession('クランチ', { reps: 25 })
    const proposal = await loadPromotionProposal(capped)
    expect(proposal).toMatchObject({
      fromName: 'クランチ',
      toName: 'ダンベルクランチ',
      fromReps: 25,
      fromSets: 3,
      toWeightKg: 2.5,
      toReps: 8,
    })

    // 見送りは保存されない=同条件の別セッションで再提案される
    const again = await createAbsSession('クランチ', { reps: 25 })
    expect(await loadPromotionProposal(again)).not.toBeNull()

    await acceptPromotion()
    expect(await loadPromotionProposal(capped)).toBeNull()
  })

  it('受諾でメニュー選択対象が入れ替わる(クランチ除外・ダンベルクランチ合流)', async () => {
    await acceptPromotion()
    const ctx = await loadEngineContext()
    const names = ctx.exercises.map((e) => e.name)
    expect(names).not.toContain('クランチ')
    expect(names).toContain('ダンベルクランチ')
    const menu = generateMenu(ctx, {
      availableMinutes: 45,
      targetMuscles: ['abs'],
      condition: 'normal',
    })
    const nameById = new Map(ctx.exercises.map((e) => [e.id!, e.name]))
    const menuNames = menu.items.map((i) => nameById.get(i.exerciseId))
    expect(menuNames).toContain('ダンベルクランチ')
    expect(menuNames).not.toContain('クランチ')
  })

  it('finishSessionが条件クリアを記録する(配線確認)', async () => {
    const exercise = (await db.exercises.toArray()).find((e) => e.name === 'レッグレイズ')!
    const sessionId = (await db.sessions.add({
      startedAt: new Date(),
      status: 'in_progress',
      muscles: ['abs'],
    })) as number
    const sessionExerciseId = (await db.session_exercises.add({
      sessionId,
      exerciseId: exercise.id!,
      order: 0,
    })) as number
    for (let i = 1; i <= 3; i++) {
      await db.sets.add({
        sessionExerciseId,
        setNumber: i,
        suggestedReps: 20,
        actualReps: 20,
        achieved: true,
        completedAt: new Date(),
      })
    }
    await finishSession(sessionId, { painParts: [] })
    expect([...(await listClearedAbsConditions())]).toEqual(['C2'])
  })
})
