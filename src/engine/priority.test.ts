import { describe, expect, it } from 'vitest'
import { INITIAL_EXERCISES } from '../constants/exercises'
import type { Goal } from '../db/types'
import { analyzeGap, priorityScores } from './priority'
import { generateMenu } from './menu'
import type { EngineContext } from './types'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]
const NOW = new Date('2026-07-10T10:00:00')
const EXERCISES = INITIAL_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }))

function goal(partial: Partial<Goal> = {}): Goal {
  return {
    profileId: 1,
    goalType: 'lean',
    wantParts: [],
    avoidParts: [],
    createdAt: NOW,
    ...partial,
  }
}

function makeCtx(overrides: Partial<EngineContext> = {}): EngineContext {
  return {
    now: NOW,
    bodyWeightKg: 58,
    dumbbellStepsKg: STEPS,
    bench: { minAngleDeg: -20, maxAngleDeg: 90 },
    exercises: EXERCISES,
    lastPerformance: new Map(),
    muscleStimuli: [],
    activeInjuries: [],
    ...overrides,
  }
}

describe('priorityScores(F-03)', () => {
  it('目標未設定は全部位1.0(従来動作)', () => {
    const scores = priorityScores(undefined)
    for (const v of Object.values(scores)) expect(v).toBe(1)
  })

  it('細マッチョは肩・腹が重点', () => {
    const scores = priorityScores(goal({ goalType: 'lean' }))
    expect(scores.shoulders).toBeGreaterThan(scores.legs)
    expect(scores.abs).toBeGreaterThan(scores.arms)
  })

  it('鍛えたい部位はブースト、鍛えたくない部位は理由タグで減衰', () => {
    const scores = priorityScores(
      goal({ wantParts: ['arms'], avoidParts: [{ part: 'legs', reason: 'dislike' }] }),
    )
    const base = priorityScores(goal())
    expect(scores.arms).toBeGreaterThan(base.arms)
    expect(scores.legs).toBeLessThan(base.legs)
  })

  it('部位特化は指定部位が最上位になる', () => {
    const scores = priorityScores(goal({ goalType: 'focus', focusParts: ['glutes'] }))
    const max = Math.max(...Object.values(scores))
    expect(scores.glutes).toBe(max)
  })
})

describe('analyzeGap(トップ3と週間推奨セット数)', () => {
  const result = analyzeGap(goal({ goalType: 'lean', wantParts: ['shoulders'] }))

  it('トップ3がスコア降順で理由付き', () => {
    expect(result.top3).toHaveLength(3)
    expect(result.top3[0].muscle).toBe('shoulders')
    expect(result.top3[0].reason).toContain('鍛えたい部位')
    expect(result.top3[0].score).toBeGreaterThanOrEqual(result.top3[1].score)
  })

  it('週間推奨セット数はスコアに比例し上限あり', () => {
    expect(result.weeklySetTargets.shoulders).toBeGreaterThan(result.weeklySetTargets.legs)
    for (const v of Object.values(result.weeklySetTargets)) {
      expect(v).toBeLessThanOrEqual(16)
    }
  })
})

describe('おまかせ部位決定への優先度接続(2-2)', () => {
  it('全部位フレッシュでも優先度の高い部位が選ばれる', () => {
    const scores = priorityScores(goal({ goalType: 'focus', focusParts: ['glutes'] }))
    const menu = generateMenu(makeCtx({ priorityScores: scores }), {
      availableMinutes: 15,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(menu.muscles).toEqual(['glutes'])
  })

  it('優先度未設定は従来動作(フレッシュネス順)', () => {
    const menu = generateMenu(makeCtx(), {
      availableMinutes: 45,
      targetMuscles: [],
      condition: 'normal',
    })
    expect(menu.items.length).toBeGreaterThan(0)
  })
})
