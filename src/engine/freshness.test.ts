import { describe, expect, it } from 'vitest'
import { calcFreshness } from './freshness'
import { RECOVERY_HOURS } from '../constants/recovery'

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
