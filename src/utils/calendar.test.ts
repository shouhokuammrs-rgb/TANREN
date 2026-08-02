// 月カレンダー導出のテスト(ISS-026)
import { describe, expect, it } from 'vitest'
import { dayKey, monthGrid, shiftMonth, trainedDayKeys } from './calendar'

describe('monthGrid(月曜始まりのグリッド)', () => {
  it('2026年8月: 7/27(月)始まり・9/6(日)終わり・42セル', () => {
    const grid = monthGrid(2026, 7)
    expect(grid).toHaveLength(42)
    expect(grid[0].date.getMonth()).toBe(6)
    expect(grid[0].date.getDate()).toBe(27)
    expect(grid[0].inMonth).toBe(false)
    const first = grid.find((c) => c.inMonth)!
    expect(first.date.getDate()).toBe(1)
    const last = grid[grid.length - 1]
    expect(last.date.getMonth()).toBe(8)
    expect(last.date.getDate()).toBe(6)
  })

  it('月内セルは日数分だけinMonth=true', () => {
    const grid = monthGrid(2026, 7)
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31)
  })

  it('長さは常に7の倍数', () => {
    for (let m = 0; m < 12; m++) {
      expect(monthGrid(2026, m).length % 7).toBe(0)
    }
  })
})

describe('trainedDayKeys(実施日の導出)', () => {
  it('同日複数セッションは1日に畳まれ、月跨ぎは別日になる', () => {
    const keys = trainedDayKeys([
      { startedAt: new Date('2026-07-31T09:00:00') },
      { startedAt: new Date('2026-07-31T19:00:00') },
      { startedAt: new Date('2026-08-01T10:00:00') },
    ])
    expect(keys.size).toBe(2)
    expect(keys.has(dayKey(new Date('2026-07-31T12:00:00')))).toBe(true)
    expect(keys.has(dayKey(new Date('2026-08-01T00:30:00')))).toBe(true)
  })
})

describe('shiftMonth(前後月ナビ・年跨ぎ)', () => {
  it('12月→翌1月・1月→前年12月', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 })
    expect(shiftMonth(2026, 7, 1)).toEqual({ year: 2026, monthIndex: 8 })
  })
})
