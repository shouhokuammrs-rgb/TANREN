import { describe, expect, it } from 'vitest'
import {
  calcFreshness,
  effectiveRecoveryHours,
  hoursUntilRecovered,
  muscleFreshnessMap,
} from './freshness'
import { RECOVERY_HOURS } from '../constants/recovery'
import type { EngineContext } from './types'

describe('calcFreshness(回復モデル)', () => {
  it('トレ直後は0%', () => {
    expect(calcFreshness(0, RECOVERY_HOURS.large)).toBe(0)
  })

  it('大筋群(72h)は36h経過で50%', () => {
    expect(calcFreshness(36, RECOVERY_HOURS.large)).toBe(50)
  })

  it('小筋群(48h)は24h経過で50%', () => {
    expect(calcFreshness(24, RECOVERY_HOURS.small)).toBe(50)
  })

  it('基準回復時間を超えたら100%で頭打ち', () => {
    expect(calcFreshness(72, RECOVERY_HOURS.large)).toBe(100)
    expect(calcFreshness(300, RECOVERY_HOURS.large)).toBe(100)
  })

  it('未トレ部位(Infinity)は100%', () => {
    expect(calcFreshness(Infinity, RECOVERY_HOURS.large)).toBe(100)
  })

  it('不正な入力はエラー', () => {
    expect(() => calcFreshness(-1, 72)).toThrow()
    expect(() => calcFreshness(10, 0)).toThrow()
  })
})

describe('上級者設定の回復時間オーバーライド(DEC-010)', () => {
  const NOW = new Date('2026-07-22T10:00:00')

  function ctxWith(overrides: Partial<EngineContext>): EngineContext {
    return {
      now: NOW,
      bodyWeightKg: 58,
      dumbbellStepsKg: [],
      exercises: [],
      lastPerformance: new Map(),
      muscleStimuli: [],
      activeInjuries: [],
      ...overrides,
    }
  }

  it('effectiveRecoveryHours: 大/小それぞれのオーバーライドのみ反映される', () => {
    // setCount 8 → ボリューム係数1
    expect(effectiveRecoveryHours('chest', 8)).toBe(72)
    expect(effectiveRecoveryHours('chest', 8, { largeRecoveryHours: 48 })).toBe(48)
    // 大筋群の設定は小筋群に影響しない(逆も同様)
    expect(effectiveRecoveryHours('shoulders', 8, { largeRecoveryHours: 24 })).toBe(48)
    expect(effectiveRecoveryHours('shoulders', 8, { smallRecoveryHours: 24 })).toBe(24)
  })

  it('オーバーライドにもボリューム補正係数が掛かる', () => {
    // setCount 3 → 係数0.85
    expect(effectiveRecoveryHours('chest', 3, { largeRecoveryHours: 40 })).toBeCloseTo(34, 5)
  })

  it('muscleFreshnessMapに反映される(36h前の刺激: デフォルト50% → 36h設定なら100%)', () => {
    const stimuli = [{ muscle: 'chest' as const, at: new Date(NOW.getTime() - 36 * 3_600_000), setCount: 8 }]
    expect(muscleFreshnessMap(ctxWith({ muscleStimuli: stimuli })).chest).toBe(50)
    expect(
      muscleFreshnessMap(ctxWith({ muscleStimuli: stimuli, tuning: { largeRecoveryHours: 36 } }))
        .chest,
    ).toBe(100)
  })
})

describe('hoursUntilRecovered(回復予測・DEC-010 §3-1)', () => {
  it('境界: 0%は全回復時間、100%は0時間', () => {
    expect(hoursUntilRecovered(0, 72)).toBe(72)
    expect(hoursUntilRecovered(100, 72)).toBe(0)
  })

  it('線形逆算: 50%×48h→残り24h(24h表示/明日以降の境界値)', () => {
    expect(hoursUntilRecovered(50, 48)).toBe(24)
    expect(hoursUntilRecovered(75, 48)).toBe(12)
  })

  it('100%超の入力でも負にならない', () => {
    expect(hoursUntilRecovered(120, 72)).toBe(0)
  })
})
