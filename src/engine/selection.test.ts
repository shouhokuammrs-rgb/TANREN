// 部位選択(DEC-006: 回復優先)と強調ローテーション(DEC-012)のユニットテスト
import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseEmphasis, MovementType, MuscleGroup } from '../db/types'
import { candidatesByMuscle, compareCandidates, emphasisRotationScore, selectMuscles } from './selection'
import type { EngineContext } from './types'

const ALL: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs', 'glutes']

function ctxWith(overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    now: new Date('2026-07-20T10:00:00'),
    bodyWeightKg: 58,
    dumbbellStepsKg: [],
    exercises: [],
    lastPerformance: new Map(),
    muscleStimuli: [],
    activeInjuries: [],
    ...overrides,
  }
}

function freshnessWith(overrides: Partial<Record<MuscleGroup, number>>): Record<MuscleGroup, number> {
  const map = Object.fromEntries(ALL.map((m) => [m, 100])) as Record<MuscleGroup, number>
  return { ...map, ...overrides }
}

describe('selectMuscles(おまかせ・DEC-006: 回復優先)', () => {
  it('100%の部位が要求数未満でも回復中部位で繰り上げ補充しない', () => {
    // 60分=3部位要求だが100%はchestのみ
    const freshness = freshnessWith({ back: 90, shoulders: 70, arms: 60, legs: 50, abs: 40, glutes: 30 })
    const result = selectMuscles(ctxWith(), [], 60, freshness)
    expect(result.muscles).toEqual(['chest'])
    expect(result.isRestDay).toBe(false)
    // 除外リストは回復が進んでいる順に全回復中部位を含む
    expect(result.excludedRecovering.map((e) => e.muscle)).toEqual([
      'back',
      'shoulders',
      'arms',
      'legs',
      'abs',
      'glutes',
    ])
    expect(result.excludedRecovering[0]).toEqual({ muscle: 'back', freshness: 90 })
  })

  it('全部位が100%未満なら空の選択+休養日フラグ(フォールバック繰り上げ廃止)', () => {
    const freshness = freshnessWith(Object.fromEntries(ALL.map((m) => [m, 99])))
    const result = selectMuscles(ctxWith(), [], 45, freshness)
    expect(result.muscles).toEqual([])
    expect(result.isRestDay).toBe(true)
    expect(result.excludedRecovering).toHaveLength(ALL.length)
  })

  it('100%部位が要求数を満たす場合は従来どおり(回帰)', () => {
    const result = selectMuscles(ctxWith(), [], 60, freshnessWith({}))
    expect(result.muscles).toHaveLength(3) // 60分=3部位
    expect(result.isRestDay).toBe(false)
    expect(result.excludedRecovering).toEqual([])
  })

  it('指定モードは変更なし: 50%未満は警告付きでそのまま採用(ユーザー判断を尊重)', () => {
    const freshness = freshnessWith({ chest: 40 })
    const result = selectMuscles(ctxWith(), ['chest'], 45, freshness)
    expect(result.muscles).toEqual(['chest'])
    expect(result.warnings.some((w) => /(回復中|休息推奨)\(\d+%\)。軽めを推奨/.test(w))).toBe(true)
    expect(result.isRestDay).toBe(false)
    expect(result.excludedRecovering).toEqual([])
  })

  it('痛みフラグの部位は回復中の除外リストに含めない(理由が異なる)', () => {
    const freshness = freshnessWith({ chest: 60, back: 70 })
    const result = selectMuscles(ctxWith({ activeInjuries: ['chest'] }), [], 45, freshness)
    expect(result.excludedRecovering.map((e) => e.muscle)).toEqual(['back'])
  })

  it('上級者設定(DEC-010): 回復下限を95に緩めるとフレッシュネス96%の部位が選ばれる', () => {
    // chestのみ96%・他は全て回復不足 → デフォルト(100)では休養日
    const freshness = freshnessWith(
      Object.fromEntries(ALL.map((m) => [m, m === 'chest' ? 96 : 40])),
    )
    const strict = selectMuscles(ctxWith(), [], 60, freshness)
    expect(strict.isRestDay).toBe(true)

    const tuned = selectMuscles(
      ctxWith({ tuning: { freshnessReadyThreshold: 95 } }),
      [],
      60,
      freshness,
    )
    expect(tuned.muscles).toEqual(['chest'])
    expect(tuned.isRestDay).toBe(false)
    expect(tuned.excludedRecovering.map((e) => e.muscle)).not.toContain('chest')
  })
})

// ===== 強調ローテーション(DEC-012) =====

function exercise(
  id: number,
  muscle: MuscleGroup,
  movementType: MovementType,
  emphasis?: ExerciseEmphasis,
): Exercise {
  return {
    id,
    name: `種目${id}`,
    primaryMuscle: muscle,
    muscleGroups: [muscle],
    movementType,
    movementPattern: movementType === 'compound' ? 'horizontal_press' : 'isolation',
    emphasis,
    requiredEquipment: ['dumbbell'],
    repRangeMin: 8,
    repRangeMax: 12,
    isActive: 1,
    formCues: [],
    commonMistake: '',
  }
}

function emphasisCtx(
  exercises: Exercise[],
  recent: ExerciseEmphasis[],
  overrides: Partial<EngineContext> = {},
): EngineContext {
  return ctxWith({
    exercises,
    dumbbellStepsKg: [10, 12],
    recentEmphasis: new Map([['chest' as MuscleGroup, recent]]),
    ...overrides,
  })
}

describe('emphasisRotationScore(DEC-012・LRU)', () => {
  it('未出現と中立は0(最優先)、出現済みは新しいほど大きい(後回し)', () => {
    expect(emphasisRotationScore(undefined, ['mid'])).toBe(0)
    expect(emphasisRotationScore('upper', ['mid'])).toBe(0)
    // 新しい順 [upper, mid]: midは古い=1、upperは直近=2
    expect(emphasisRotationScore('mid', ['upper', 'mid'])).toBe(1)
    expect(emphasisRotationScore('upper', ['upper', 'mid'])).toBe(2)
  })
})

describe('candidatesByMuscle: 強調ローテーション(DEC-012)', () => {
  const flatPress = exercise(1, 'chest', 'compound', 'mid')
  const inclinePress = exercise(2, 'chest', 'compound', 'upper')
  const declinePress = exercise(3, 'chest', 'compound', 'lower')

  it('前回midなら未出現(upper/lower)の種目が上位に来る', () => {
    const ctx = emphasisCtx([flatPress, inclinePress, declinePress], ['mid'])
    const list = candidatesByMuscle(ctx, ['chest'], 'normal').get('chest')!
    expect(list.map((e) => e.id)).toEqual([2, 3]) // 未出現のupper/lower(同点はID順)
  })

  it('未出現が最優先、出現済みは古い順(LRU)', () => {
    // 新しい順 [upper, mid] → lower(未出現) → mid(古い) → upper(直近)
    const ctx = emphasisCtx([flatPress, inclinePress, declinePress], ['upper', 'mid'])
    const sorted = [flatPress, inclinePress, declinePress].sort(compareCandidates(ctx, 'chest'))
    expect(sorted.map((e) => e.id)).toEqual([3, 1, 2])
  })

  it('コンパウンド優先はローテーションより上位(未出現のisolationが出現済みcompoundを追い越さない)', () => {
    const inclineFly = exercise(4, 'chest', 'isolation', 'upper')
    const ctx = emphasisCtx([inclineFly, flatPress], ['mid'])
    const sorted = [inclineFly, flatPress].sort(compareCandidates(ctx, 'chest'))
    expect(sorted.map((e) => e.id)).toEqual([1, 4])
  })

  it('中立のみの部位は現行の並びのまま(回帰: 実績→ID)', () => {
    const rowA = exercise(11, 'back', 'compound')
    const rowB = exercise(12, 'back', 'compound')
    const withHistory = new Map([[12, { exerciseId: 12, performedAt: new Date(), sets: [] }]])
    const base = ctxWith({ exercises: [rowA, rowB], dumbbellStepsKg: [10], lastPerformance: withHistory })
    const withRotation = { ...base, recentEmphasis: new Map() }
    const sortedBase = [rowA, rowB].sort(compareCandidates(base, 'back')).map((e) => e.id)
    const sortedRotation = [rowA, rowB].sort(compareCandidates(withRotation, 'back')).map((e) => e.id)
    expect(sortedBase).toEqual([12, 11]) // 実績あり優先
    expect(sortedRotation).toEqual(sortedBase)
  })
})
