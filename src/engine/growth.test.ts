// 成長算出(DEC-011)のユニットテスト
import { describe, expect, it } from 'vitest'
import { GROWTH_COLD, GROWTH_HEAT_SCALE, growthHeatOf } from '../constants/charts'
import type { MuscleGroup } from '../db/types'
import {
  growthE1Rm,
  muscleGrowthMap,
  sessionE1Rm,
  sessionMaxReps,
  type GrowthSessionInput,
} from './growth'

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
    expect(growth.points[growth.points.length - 1].value).toBeCloseTo(14.5 * (1 + 10 / 30), 5)
  })

  it('実績ゼロの部位はsessionCount 0・基準種目なし', () => {
    const growth = muscleGrowthMap([], 30, NOW).back
    expect(growth).toMatchObject({ sessionCount: 0, hasEnoughData: false, points: [] })
    expect(growth.anchorExerciseId).toBeUndefined()
  })
})

// ===== 自重種目のレップベース成長指標(ISS-018) =====

/** クランチ(id:10・自重)のレップだけ変えたセッション */
function crunch(at: Date, reps: number): GrowthSessionInput {
  return {
    performedAt: at,
    exerciseId: 10,
    exerciseName: 'クランチ',
    muscle: 'abs',
    bodyweight: true,
    sets: [{ reps: reps - 3 }, { reps }],
  }
}

/** ロシアンツイスト(id:11・ダンベル使用)のセッション */
function russianTwist(at: Date, weightKg: number): GrowthSessionInput {
  return {
    performedAt: at,
    exerciseId: 11,
    exerciseName: 'ロシアンツイスト',
    muscle: 'abs',
    sets: [{ weightKg, reps: 20 }],
  }
}

describe('自重種目のレップ指標(ISS-018)', () => {
  it('sessionMaxReps: 記録セット中の最大レップ。E1RM_REP_CLAMP(12)は適用しない', () => {
    expect(sessionMaxReps([{ reps: 15 }, { reps: 25 }, { reps: 20 }])).toBe(25)
    expect(sessionMaxReps([{ reps: 0 }, {}])).toBeUndefined()
  })

  it('自重セット(weightなし)のみのセッションからレップ点列が生成される', () => {
    const growth = muscleGrowthMap(
      [crunch(daysAgo(20), 15), crunch(daysAgo(10), 18), crunch(daysAgo(2), 22)],
      30,
      NOW,
    ).abs
    expect(growth.metric).toBe('reps')
    expect(growth.anchorExerciseName).toBe('クランチ')
    expect(growth.hasEnoughData).toBe(true)
    expect(growth.points.map((p) => p.value)).toEqual([15, 18, 22])
  })

  it('レップ成長率は同一式 (last-first)/first。月換算・クランプ非適用も同様', () => {
    const growth = muscleGrowthMap(
      [crunch(daysAgo(20), 15), crunch(daysAgo(10), 18), crunch(daysAgo(2), 22)],
      30,
      NOW,
    ).abs
    // 22はクランプされずそのまま点になる(クランプすると成長が消える)
    expect(growth.growthRate).toBeCloseTo((22 - 15) / 15, 5)
    expect(growth.monthlyRate).toBeCloseTo(((22 - 15) / 15) * 1, 5)
  })

  it('混在部位(腹): 基準種目選定は指標をまたいで回数ベース(クランチ3回 vs ツイスト2回)', () => {
    const sessions = [
      crunch(daysAgo(20), 15),
      crunch(daysAgo(10), 18),
      crunch(daysAgo(2), 22),
      russianTwist(daysAgo(15), 8),
      russianTwist(daysAgo(5), 10),
    ]
    const growth = muscleGrowthMap(sessions, 30, NOW).abs
    expect(growth.anchorExerciseName).toBe('クランチ')
    expect(growth.metric).toBe('reps')
  })

  it('混在部位: ダンベル種目が最多ならe1RM指標のまま(回帰)', () => {
    const sessions = [
      crunch(daysAgo(10), 18),
      russianTwist(daysAgo(15), 8),
      russianTwist(daysAgo(5), 10),
      russianTwist(daysAgo(1), 10),
    ]
    const growth = muscleGrowthMap(sessions, 30, NOW).abs
    expect(growth.anchorExerciseName).toBe('ロシアンツイスト')
    expect(growth.metric).toBe('e1rm')
    // e1RM側は従来どおりクランプあり(reps20→12扱い)
    expect(growth.points[0].value).toBeCloseTo(8 * (1 + 12 / 30), 5)
  })

  it('ダンベル種目のみの部位はmetric=e1rmで従来どおり(回帰)', () => {
    const growth = muscleGrowthMap(
      [press(daysAgo(10), 11.5), press(daysAgo(5), 13), press(daysAgo(2), 14.5)],
      30,
      NOW,
    ).chest
    expect(growth.metric).toBe('e1rm')
    expect(growth.growthRate).toBeGreaterThan(0)
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

// ===== ホームの成長1行サマリー(DEC-015 §3-4) =====
import { weeklyTopGain } from './growth'

function gainSession(
  muscle: 'chest' | 'back',
  daysAgo: number,
  weightKg: number,
  name = `${muscle}-lift`,
): GrowthSessionInput {
  return {
    performedAt: new Date(Date.now() - daysAgo * 24 * 3_600_000),
    exerciseId: muscle === 'chest' ? 1 : 2,
    exerciseName: name,
    muscle,
    sets: [{ weightKg, reps: 10 }],
  }
}

describe('weeklyTopGain(直近7日で上昇幅最大の部位)', () => {
  const now = new Date()

  it('上昇幅が最大の部位を選ぶ(kg差・小数第1位)', () => {
    const result = weeklyTopGain(
      [
        gainSession('chest', 10, 13), // 基準
        gainSession('chest', 1, 14.5), // +1.5kg → e1RM差 +2.0
        gainSession('back', 10, 13),
        gainSession('back', 1, 13.5), // +0.5kg
      ],
      now,
    )
    expect(result?.muscle).toBe('chest')
    expect(result?.gainKg).toBeCloseTo((14.5 - 13) * (1 + 10 / 30), 1)
  })

  it('全部位横ばい以下ならnull(ブロック非表示)', () => {
    expect(
      weeklyTopGain([gainSession('chest', 10, 14.5), gainSession('chest', 1, 14.5)], now),
    ).toBeNull()
    expect(
      weeklyTopGain([gainSession('chest', 10, 14.5), gainSession('chest', 1, 13)], now),
    ).toBeNull()
  })

  it('直近7日に記録がない部位・7日前以前の基準がない部位は対象外', () => {
    // 記録が古い(8日前が最新)
    expect(weeklyTopGain([gainSession('chest', 20, 10), gainSession('chest', 8, 14.5)], now)).toBeNull()
    // 直近7日の記録しかない(比較基準なし)
    expect(weeklyTopGain([gainSession('chest', 2, 14.5)], now)).toBeNull()
  })

  it('自重(レップ指標)セッションは対象外', () => {
    const bodyweight: GrowthSessionInput = {
      performedAt: new Date(),
      exerciseId: 9,
      exerciseName: 'プランク',
      muscle: 'abs',
      bodyweight: true,
      sets: [{ reps: 30 }],
    }
    const old: GrowthSessionInput = { ...bodyweight, performedAt: new Date(Date.now() - 10 * 24 * 3_600_000), sets: [{ reps: 10 }] }
    expect(weeklyTopGain([old, bodyweight], new Date())).toBeNull()
  })
})
