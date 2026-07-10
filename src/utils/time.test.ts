import { describe, expect, it } from 'vitest'
import { calcSleepHours } from './time'

describe('calcSleepHours(睡眠時間の自動計算)', () => {
  it('日跨ぎ(23:30→06:30)は7時間', () => {
    expect(calcSleepHours('23:30', '06:30')).toBe(7)
  })

  it('同日内(01:00→08:15)は7.25時間', () => {
    expect(calcSleepHours('01:00', '08:15')).toBe(7.25)
  })

  it('同時刻は0時間', () => {
    expect(calcSleepHours('07:00', '07:00')).toBe(0)
  })

  it('形式不正はnull', () => {
    expect(calcSleepHours('', '06:30')).toBeNull()
    expect(calcSleepHours('25:00', '06:30')).toBeNull()
    expect(calcSleepHours('23:30', 'abc')).toBeNull()
  })
})
