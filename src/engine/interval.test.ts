import { describe, expect, it } from 'vitest'
import { intervalSecFor, purposeForReps } from './interval'

describe('purposeForReps(目的判定)', () => {
  it('1-5レップは筋力', () => {
    expect(purposeForReps(1)).toBe('strength')
    expect(purposeForReps(5)).toBe('strength')
  })

  it('6-12レップは筋肥大', () => {
    expect(purposeForReps(6)).toBe('hypertrophy')
    expect(purposeForReps(12)).toBe('hypertrophy')
  })

  it('13レップ以上は持久・引き締め', () => {
    expect(purposeForReps(13)).toBe('endurance')
    expect(purposeForReps(20)).toBe('endurance')
  })
})

describe('intervalSecFor(インターバルテーブル)', () => {
  it('アイソレーション種目は基準値そのまま', () => {
    expect(intervalSecFor(5, 'isolation')).toBe(180)
    expect(intervalSecFor(10, 'isolation')).toBe(90)
    expect(intervalSecFor(15, 'isolation')).toBe(60)
  })

  it('コンパウンド種目は+30秒', () => {
    expect(intervalSecFor(10, 'compound')).toBe(120)
  })
})
