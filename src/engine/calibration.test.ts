import { describe, expect, it } from 'vitest'
import { INITIAL_EXERCISES } from '../constants/exercises'
import type { StrengthMark } from '../db/types'
import { calibratedWeightKg, epley1Rm, patternBase1RmFrom } from './calibration'
import { initialWeightKg, suggestWeightReps } from './progression'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]
const EXERCISES = INITIAL_EXERCISES.map((e, i) => ({ ...e, id: i + 1 }))

const flatPress = EXERCISES.find((e) => e.name === 'ダンベルベンチプレス')!
const inclinePress = EXERCISES.find((e) => e.name === 'インクラインダンベルプレス')!
const curl = EXERCISES.find((e) => e.name === 'ダンベルカール')!
const pushup = EXERCISES.find((e) => e.name === 'プッシュアップ')!

function mark(refLiftId: string, weightKg: number, reps: number, at = '2026-07-10T09:00:00'): StrengthMark {
  return { refLiftId, weightKg, reps, recordedAt: new Date(at) }
}

describe('epley1Rm(推定1RM)', () => {
  it('Epley式: 1RM = 重量 × (1 + レップ/30)', () => {
    expect(epley1Rm(45, 7)).toBeCloseTo(55.5, 5)
    expect(epley1Rm(100, 1)).toBeCloseTo(103.33, 1)
  })

  it('不正な入力はエラー', () => {
    expect(() => epley1Rm(0, 5)).toThrow()
    expect(() => epley1Rm(45, 0)).toThrow()
  })
})

describe('patternBase1RmFrom(パターン基準1RM)', () => {
  it('バーベル種目は推定1RMがそのまま基準になる', () => {
    const base = patternBase1RmFrom([mark('barbell_bench_press', 45, 7)])
    expect(base.horizontal_press).toBeCloseTo(55.5, 5)
    expect(base.squat).toBeUndefined()
  })

  it('ダンベル種目は換算係数でバーベル相当に引き上げる', () => {
    const base = patternBase1RmFrom([mark('dumbbell_bench_press', 14, 10)])
    // 14×(1+10/30)=18.67 → ×2.9 ≒ 54.1
    expect(base.horizontal_press).toBeCloseTo(18.666 * 2.9, 1)
  })

  it('同一基準種目は最新の入力を採用する', () => {
    const base = patternBase1RmFrom([
      mark('barbell_bench_press', 40, 5, '2026-07-01T09:00:00'),
      mark('barbell_bench_press', 50, 5, '2026-07-09T09:00:00'),
    ])
    expect(base.horizontal_press).toBeCloseTo(epley1Rm(50, 5), 5)
  })

  it('同一パターンに複数の基準種目があれば最大値を使う', () => {
    const base = patternBase1RmFrom([
      mark('barbell_bench_press', 40, 5),
      mark('dumbbell_bench_press', 20, 8),
    ])
    expect(base.horizontal_press).toBeCloseTo(
      Math.max(epley1Rm(40, 5), epley1Rm(20, 8) * 2.9),
      5,
    )
  })

  it('未知の基準種目IDは無視する', () => {
    expect(patternBase1RmFrom([mark('unknown_lift', 100, 5)])).toEqual({})
  })
})

describe('受け入れ条件: ベンチプレス45kg×7 → ダンベルプレス初期提案が10〜12.5kg帯', () => {
  const base = patternBase1RmFrom([mark('barbell_bench_press', 45, 7)])

  it('ダンベルベンチプレスの初期重量が10〜12.5kgに収まる(刻みスナップ済み)', () => {
    const weight = initialWeightKg(flatPress, 58, STEPS, base)!
    expect(weight).toBeGreaterThanOrEqual(10)
    expect(weight).toBeLessThanOrEqual(12.5)
    expect(STEPS).toContain(weight)
  })

  it('suggestWeightReps(ログなし)でも同じ帯に収まる', () => {
    const { weightKg, reps } = suggestWeightReps(flatPress, undefined, 58, STEPS, base)
    expect(weightKg).toBeGreaterThanOrEqual(10)
    expect(weightKg).toBeLessThanOrEqual(12.5)
    expect(reps).toBe(flatPress.repRangeMin)
  })

  it('インクラインはフラットより軽い提案になる', () => {
    const flat = initialWeightKg(flatPress, 58, STEPS, base)!
    const incline = initialWeightKg(inclinePress, 58, STEPS, base)!
    expect(incline).toBeLessThan(flat)
  })
})

describe('フォールバック(筋力入力ゼロでも従来動作)', () => {
  it('基準1RMなし → 体重比デフォルトと同じ提案', () => {
    expect(initialWeightKg(flatPress, 58, STEPS, {})).toBe(initialWeightKg(flatPress, 58, STEPS))
  })

  it('isolationパターンは換算対象外 → 体重比デフォルト', () => {
    const base = patternBase1RmFrom([mark('barbell_bench_press', 100, 5)])
    expect(calibratedWeightKg(curl, base)).toBeUndefined()
    expect(initialWeightKg(curl, 58, STEPS, base)).toBe(initialWeightKg(curl, 58, STEPS))
  })

  it('自重種目はキャリブレーションがあってもundefined', () => {
    const base = patternBase1RmFrom([mark('barbell_bench_press', 100, 5)])
    expect(calibratedWeightKg(pushup, base)).toBeUndefined()
  })

  it('ログがある種目はキャリブレーションではなくダブルプログレッションが優先', () => {
    const base = patternBase1RmFrom([mark('barbell_bench_press', 100, 5)])
    const last = {
      exerciseId: flatPress.id!,
      performedAt: new Date('2026-07-01T10:00:00'),
      sets: [{ weightKg: 8.5, reps: 8, achieved: true }],
    }
    const { weightKg } = suggestWeightReps(flatPress, last, 58, STEPS, base)
    expect(weightKg).toBe(8.5)
  })
})
