// おまかせ部位決定への優先度接続(2-2)。優先度値の算出はgoal.test.ts(DEC-013)側でテスト済み
import { describe, expect, it } from 'vitest'
import { INITIAL_EXERCISES } from '../constants/exercises'
import { generateMenu } from './menu'
import type { EngineContext } from './types'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]
const NOW = new Date('2026-07-10T10:00:00')
const EXERCISES = INITIAL_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }))

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

describe('おまかせ部位決定への優先度接続(2-2)', () => {
  it('全部位フレッシュでも優先度の高い部位が選ばれる', () => {
    const menu = generateMenu(
      makeCtx({
        priorityScores: {
          chest: 1,
          back: 1,
          shoulders: 1,
          arms: 1,
          legs: 1,
          abs: 1,
          glutes: 1.8,
        },
      }),
      { availableMinutes: 15, targetMuscles: [], condition: 'normal' },
    )
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
