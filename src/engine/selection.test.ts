// 部位選択(DEC-006: 回復優先)のユニットテスト
import { describe, expect, it } from 'vitest'
import type { MuscleGroup } from '../db/types'
import { selectMuscles } from './selection'
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
})
