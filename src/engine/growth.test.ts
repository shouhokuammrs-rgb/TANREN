// 成長算出(DEC-011)のユニットテスト
import { describe, expect, it } from 'vitest'
import { GROWTH_COLD, GROWTH_HEAT_SCALE, growthHeatOf } from '../constants/charts'
import type { MuscleGroup } from '../db/types'
import { growthE1Rm, muscleGrowthMap, sessionE1Rm, type GrowthSessionInput } from './growth'

const NOW = new Date('2026-07-22T12:00:00')

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 3_600_000)
}

function session(
  performedAt: Date,
  exerciseId: number,
  exerciseName: string,
  muscle: MuscleGroup,
  sets: { weightKg?: number; reps?: number }[],
): GrowthSessionInput {
  return { performedAt, exerciseId, exerciseName, muscle, sets }
}

/** ダンベルプレス(id:1)の重量だけ変えたセッションを作る簡易ヘルパー */
function press(at: Date, weightKg: number, reps = 10): GrowthSessionInput {
  return session(at, 1, 'ダンベルベンチプレス', 'chest', [{ weightKg, reps }])
}

describe('growthE1Rm(Epley・レップ12クランプ)', () => {
  it('Epley式: weight × (1 + reps/30)', () => {
    expect(growthE1Rm(100, 6)).toBeCloseTo(120, 5)
    expect(growthE1Rm(14, 10)).toBeCloseTo(14 * (1 + 10 / 30), 5)
  })

  it('レップ12でクランプ(境界: 12はそのまま、13以上は12扱い)', () => {
    expect(growthE1Rm(100, 12)).toBeCloseTo(140, 5)
    expect(growthE1Rm(100, 13)).toBeCloseTo(140, 5)
    expect(growthE1Rm(100, 30)).toBeCloseTo(140, 5)
  })
})

describe('sessionE1Rm(セッションe1RM=セット最大値)', () => {
  it('全記録セットのEpley値の最大を採用する', () => {
    // 20×10=26.67 / 22×6=26.4 → 前者
    expect(sessionE1Rm([{ weightKg: 20, reps: 10 }, { weightKg: 22, reps: 6 }])).toBeCloseTo(
      20 * (1 + 10 / 30),
      5,
    )
  })

  it('重量なし(自重)・不正セットは無視し、有効セットゼロならundefined', () => {
    expect(sessionE1Rm([{ reps: 15 }, { weightKg: 10, reps: 8 }])).toBeCloseTo(10 * (1 + 8 / 30), 5)
    expect(sessionE1Rm([{ reps: 15 }, { weightKg: 0, reps: 5 }])).toBeUndefined()
  })
})

describe('muscleGrowthMap: 基準種目の選定(DEC-011 §1-3)', () => {
  it('期間内セッション数が最多の種目が基準になる', () => {
    const sessions = [
      press(daysAgo(20), 11.5),
      press(daysAgo(10), 13),
      press(daysAgo(2), 14.5),
      session(daysAgo(15), 2, 'ダンベルフライ', 'chest', [{ weightKg: 8.5, reps: 12 }]),
    ]
    const growth = muscleGrowthMap(sessions, 30, NOW).chest
    expect(growth.anchorExerciseId).toBe(1)
    expect(growth.anchorExerciseName).toBe('ダンベルベンチプレス')
    expect(growth.sessionCount).toBe(3)
  })

  it('同数の場合は直近セッションが新しい方', () => {
    const sessions = [
      press(daysAgo(20), 11.5),
      press(daysAgo(10), 13),
      session(daysAgo(15), 2, 'ダンベルフライ', 'chest', [{ weightKg: 8.5, reps: 12 }]),
      session(daysAgo(1), 2, 'ダンベルフライ', 'chest', [{ weightKg: 10, reps: 12 }]),
    ]
    expect(muscleGrowthMap(sessions, 30, NOW).chest.anchorExerciseId).toBe(2)
  })

  it('期間によって基準種目が変わる(部位の成長は基準種目内でのみ比較)', () => {
    const sessions = [
      // フライは60〜80日前に3回(90日窓でのみ最多)
      session(daysAgo(80), 2, 'ダンベルフライ', 'chest', [{ weightKg: 7, reps: 10 }]),
      session(daysAgo(70), 2, 'ダンベルフライ', 'chest', [{ weightKg: 8.5, reps: 10 }]),
      session(daysAgo(60), 2, 'ダンベルフライ', 'chest', [{ weightKg: 10, reps: 10 }]),
      // プレスは直近30日に2回
      press(daysAgo(10), 13),
      press(daysAgo(2), 14.5),
    ]
    expect(muscleGrowthMap(sessions, 90, NOW).chest.anchorExerciseId).toBe(2)
    expect(muscleGrowthMap(sessions, 30, NOW).chest.anchorExerciseId).toBe(1)
  })
})

describe('muscleGrowthMap: 成長率と月換算(DEC-011 §1-4)', () => {
  // 11.5→14.5kg(レップ10固定): 実測 +26.09%
  const sessions = (spreadDays: number) => [
    press(daysAgo(spreadDays), 11.5),
    press(daysAgo(Math.round(spreadDays / 2)), 13),
    press(daysAgo(1), 14.5),
  ]

  it('実測変化率 = (最新 − 最古) / 最古(チップ・グラフ表示用)', () => {
    const growth = muscleGrowthMap(sessions(25), 30, NOW).chest
    expect(growth.growthRate).toBeCloseTo((14.5 - 11.5) / 11.5, 5)
  })

  it('月換算 = 実測 × 30/期間日数(人体図の色エンコーディング専用)', () => {
    const rate = (14.5 - 11.5) / 11.5
    expect(muscleGrowthMap(sessions(25), 30, NOW).chest.monthlyRate).toBeCloseTo(rate, 5)
    expect(muscleGrowthMap(sessions(80), 90, NOW).chest.monthlyRate).toBeCloseTo(rate * (30 / 90), 5)
  })

  it('期間外のセッションは含まれない', () => {
    // 80日前・40日前・1日前のうち、30日窓に入るのは1回分のみ
    const growth = muscleGrowthMap(sessions(80), 30, NOW).chest
    expect(growth.sessionCount).toBe(1)
    expect(growth.hasEnoughData).toBe(false)
  })
})

describe('muscleGrowthMap: データ不足判定(DEC-011 §1-5)', () => {
  it('セッション2回は「冷えた鉄」(変化率なし)、3回で表示', () => {
    const two = muscleGrowthMap([press(daysAgo(10), 11.5), press(daysAgo(2), 13)], 30, NOW).chest
    expect(two.hasEnoughData).toBe(false)
    expect(two.sessionCount).toBe(2)
    expect(two.growthRate).toBeUndefined()

    const three = muscleGrowthMap(
      [press(daysAgo(10), 11.5), press(daysAgo(5), 13), press(daysAgo(2), 14.5)],
      30,
      NOW,
    ).chest
    expect(three.hasEnoughData).toBe(true)
    expect(three.growthRate).toBeGreaterThan(0)
  })

  it('同一日の同種目は1セッションに統合(e1RMは最大値)', () => {
    const day = daysAgo(3)
    const growth = muscleGrowthMap(
      [press(daysAgo(10), 11.5), press(day, 13), press(new Date(day.getTime() + 3_600_000), 14.5)],
      30,
      NOW,
    ).chest
    expect(growth.sessionCount).toBe(2)
    // 同日はe1RM最大(14.5ベース)を採用
    expect(growth.points[growth.points.length - 1].e1RmKg).toBeCloseTo(14.5 * (1 + 10 / 30), 5)
  })

  it('実績ゼロの部位はsessionCount 0・基準種目なし', () => {
    const growth = muscleGrowthMap([], 30, NOW).back
    expect(growth).toMatchObject({ sessionCount: 0, hasEnoughData: false, points: [] })
    expect(growth.anchorExerciseId).toBeUndefined()
  })
})

describe('growthHeatOf(熱の色スケール・境界値)', () => {
  it('閾値表どおりに写像される(月換算%)', () => {
    expect(growthHeatOf(0).color).toBe('#5A2E14') // 微温
    expect(growthHeatOf(2.9).color).toBe('#5A2E14')
    expect(growthHeatOf(3).color).toBe('#8A431C') // 温
    expect(growthHeatOf(5.9).color).toBe('#8A431C')
    expect(growthHeatOf(6).color).toBe('#C2521C') // 熱
    expect(growthHeatOf(9).color).toBe('#FF5C1A') // 高熱
    expect(growthHeatOf(12).color).toBe('#FFB300') // 白熱
    expect(growthHeatOf(50).color).toBe('#FFB300')
  })

  it('9%以上のみグロー', () => {
    expect(growthHeatOf(8.9).glow).toBe(false)
    expect(growthHeatOf(9).glow).toBe(true)
  })

  it('マイナス成長は0%側(微温)に丸める。データ不足色は別定義', () => {
    expect(growthHeatOf(-5).color).toBe('#5A2E14')
    expect(GROWTH_COLD.fill).toBe('#1C140E')
    expect(GROWTH_HEAT_SCALE).toHaveLength(5)
  })
})
