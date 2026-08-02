// 腹の段位型ゴール(DEC-017改/018改)の純関数テスト
import { describe, expect, it } from 'vitest'
import { absAttained, absLevelRank, absLevelSatisfied, isCapReached } from './absGoal'
import { INITIAL_EXERCISES } from '../constants/exercises'
import { suggestWeightReps } from './progression'

const CAP = { repRangeMax: 25 }

describe('isCapReached(上限完遂の共通述語)', () => {
  it('全セット達成+最小レップが上限以上で真', () => {
    expect(
      isCapReached(CAP, [
        { reps: 25, achieved: true },
        { reps: 26, achieved: true },
        { reps: 25, achieved: true },
      ]),
    ).toBe(true)
  })

  it('1セットでも上限未満なら偽', () => {
    expect(
      isCapReached(CAP, [
        { reps: 25, achieved: true },
        { reps: 24, achieved: true },
      ]),
    ).toBe(false)
  })

  it('未達成セットがあれば偽', () => {
    expect(
      isCapReached(CAP, [
        { reps: 25, achieved: true },
        { reps: 25, achieved: false },
      ]),
    ).toBe(false)
  })

  it('「限界でした」が付いた回は偽(progression.tsの頭打ち分岐と同条件)', () => {
    expect(
      isCapReached(CAP, [
        { reps: 25, achieved: true, atFailure: true },
        { reps: 25, achieved: true },
      ]),
    ).toBe(false)
  })

  it('記録セットなしは偽', () => {
    expect(isCapReached(CAP, [])).toBe(false)
    expect(isCapReached(CAP, [{ achieved: true }])).toBe(false)
  })
})

describe('absAttained(段位導出・順不同)', () => {
  it('条件なし=段位なし', () => {
    expect(absAttained([])).toBeNull()
  })

  it('自重どちらか(C1またはC2)=引き締め', () => {
    expect(absAttained(['C1'])).toBe('toned')
    expect(absAttained(['C2'])).toBe('toned')
  })

  it('自重2種目とも(C1かつC2)=しっかり', () => {
    expect(absAttained(['C1', 'C2'])).toBe('solid')
    expect(absAttained(['C2', 'C1'])).toBe('solid')
  })

  it('C3=がっつり(自重の充足状況に依らない=順不同)', () => {
    expect(absAttained(['C3'])).toBe('big')
    expect(absAttained(['C1', 'C3'])).toBe('big')
    expect(absAttained(['C1', 'C2', 'C3'])).toBe('big')
  })
})

describe('absLevelSatisfied(選択ゴールへの到達判定)', () => {
  it('到達段位 ≥ 選択段位で真', () => {
    expect(absLevelSatisfied(['C1'], 'toned')).toBe(true)
    expect(absLevelSatisfied(['C1'], 'solid')).toBe(false)
    expect(absLevelSatisfied(['C1', 'C2'], 'toned')).toBe(true)
    expect(absLevelSatisfied(['C1', 'C2'], 'solid')).toBe(true)
    expect(absLevelSatisfied(['C1', 'C2'], 'big')).toBe(false)
    expect(absLevelSatisfied(['C3'], 'big')).toBe(true)
    expect(absLevelSatisfied([], 'toned')).toBe(false)
  })

  it('ランク: none < toned < solid < big', () => {
    expect(absLevelRank(null)).toBe(0)
    expect(absLevelRank('toned')).toBeLessThan(absLevelRank('solid'))
    expect(absLevelRank('solid')).toBeLessThan(absLevelRank('big'))
  })
})

describe('ダンベルクランチ(DEC-017改の種目マスタ)', () => {
  const dumbbellCrunch = INITIAL_EXERCISES.find((e) => e.name === 'ダンベルクランチ')!

  it('腹・ダンベル種目・昇格受諾までは無効(isActive: 0)', () => {
    expect(dumbbellCrunch).toBeDefined()
    expect(dumbbellCrunch.primaryMuscle).toBe('abs')
    expect(dumbbellCrunch.requiredEquipment).toEqual(['dumbbell'])
    expect(dumbbellCrunch.isActive).toBe(0)
    expect(dumbbellCrunch.repRangeMin).toBe(8) // spec §1-3「2.5kg・8回から」
  })

  it('実績なしの初回提案は2.5kg・8回(昇格カードの再開条件と一致)', () => {
    const steps = [2.5, 5, 7.5, 10]
    const suggestion = suggestWeightReps(dumbbellCrunch, undefined, 58, steps)
    expect(suggestion).toEqual({ weightKg: 2.5, reps: 8 })
  })

  it('上限完遂で通常の増量ループ(DEC-007)に乗る(次の刻みへ+レップ下限)', () => {
    const steps = [2.5, 5, 7.5, 10]
    const last = {
      exerciseId: 999,
      performedAt: new Date(),
      sets: [
        { weightKg: 2.5, reps: 15, achieved: true },
        { weightKg: 2.5, reps: 15, achieved: true },
        { weightKg: 2.5, reps: 15, achieved: true },
      ],
    }
    const suggestion = suggestWeightReps(dumbbellCrunch, last, 58, steps)
    expect(suggestion).toEqual({ weightKg: 5, reps: 8 })
  })
})
