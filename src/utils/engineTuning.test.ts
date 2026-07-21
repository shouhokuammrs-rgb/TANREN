// 上級者設定(DEC-010)の永続化サニタイズのテスト
import { describe, expect, it } from 'vitest'
import { sanitizeEngineTuning } from './engineTuning'

describe('sanitizeEngineTuning(DEC-010)', () => {
  it('許容範囲外はclampされる', () => {
    expect(sanitizeEngineTuning({ largeRecoveryHours: 500 })).toEqual({ largeRecoveryHours: 120 })
    expect(sanitizeEngineTuning({ largeRecoveryHours: 1 })).toEqual({ largeRecoveryHours: 24 })
    expect(sanitizeEngineTuning({ slackJumpSteps: 9 })).toEqual({ slackJumpSteps: 3 })
    expect(sanitizeEngineTuning({ freshnessReadyThreshold: 10 })).toEqual({
      freshnessReadyThreshold: 50,
    })
    expect(sanitizeEngineTuning({ defaultSets: 6 })).toEqual({ defaultSets: 5 })
  })

  it('小数は丸め、数値以外・未知キー・非オブジェクトは落とす', () => {
    expect(sanitizeEngineTuning({ smallRecoveryHours: 47.6 })).toEqual({ smallRecoveryHours: 48 })
    expect(sanitizeEngineTuning({ defaultSets: '4', unknownKey: 99, slackJumpSteps: NaN })).toEqual(
      {},
    )
    expect(sanitizeEngineTuning(null)).toEqual({})
    expect(sanitizeEngineTuning('broken')).toEqual({})
  })

  it('範囲内の値はそのまま通る(部分指定OK)', () => {
    expect(sanitizeEngineTuning({ freshnessReadyThreshold: 95, defaultSets: 4 })).toEqual({
      freshnessReadyThreshold: 95,
      defaultSets: 4,
    })
  })
})
