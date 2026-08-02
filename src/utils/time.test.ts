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

// ===== 所要時間の表記(ISS-026) =====
import { formatDurationJa } from './time'

describe('formatDurationJa(所要時間の表記境界)', () => {
  it('59分以下は「N分」・60分以上は「N時間M分」', () => {
    expect(formatDurationJa(1)).toBe('1分')
    expect(formatDurationJa(32)).toBe('32分')
    expect(formatDurationJa(59)).toBe('59分')
    expect(formatDurationJa(60)).toBe('1時間0分')
    expect(formatDurationJa(72)).toBe('1時間12分')
    expect(formatDurationJa(135)).toBe('2時間15分')
  })
})
