// 実行画面メニュー一覧シート(ISS-021)の状態導出テスト
import { describe, expect, it } from 'vitest'
import { entryStatuses } from './workoutMenu'

const done = { completedAt: new Date() }
const todo = { completedAt: undefined }

describe('entryStatuses(ISS-021): 済/実施中/未の導出', () => {
  it('全完了=done / 最初の未完了を含む種目=active / 以降=pending', () => {
    expect(
      entryStatuses([
        { sets: [done, done, done] }, // 1種目め: 全完了
        { sets: [done, todo, todo] }, // 2種目め: 実施中
        { sets: [todo, todo, todo] }, // 3種目め: 未着手
      ]),
    ).toEqual(['done', 'active', 'pending'])
  })

  it('開始直後は先頭がactive・残りはpending', () => {
    expect(entryStatuses([{ sets: [todo] }, { sets: [todo] }])).toEqual(['active', 'pending'])
  })

  it('全種目完了なら全てdone(activeなし)', () => {
    expect(entryStatuses([{ sets: [done] }, { sets: [done, done] }])).toEqual(['done', 'done'])
  })

  it('実施中の判定は実行画面のfirstIncompleteと同じ規則(完了種目を挟んでも順序で最初の未完了)', () => {
    // 1種目めが部分完了のまま2種目めが完了しているケース(スキップ運用)
    expect(
      entryStatuses([{ sets: [done, todo] }, { sets: [done] }, { sets: [todo] }]),
    ).toEqual(['active', 'done', 'pending'])
  })

  it('空メニューは空配列・セット0の種目はdone扱いにしない', () => {
    expect(entryStatuses([])).toEqual([])
    expect(entryStatuses([{ sets: [] }])).toEqual(['active'])
  })
})
