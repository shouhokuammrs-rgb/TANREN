import { describe, expect, it } from 'vitest'
import { detectPrSetNumbers, setScore, summarizeExercise } from './summary'

describe('PR検出(F-07・受け入れ条件)', () => {
  const past = [
    { weightKg: 11.5, reps: 10 }, // e1RM ≒ 15.3
    { weightKg: 13, reps: 8 }, // e1RM ≒ 16.5(過去ベスト)
  ]

  it('推定1RMが過去ベストを上回るセットがPRになる', () => {
    const today = [
      { setNumber: 1, weightKg: 13, reps: 8 }, // 同スコア→PRではない
      { setNumber: 2, weightKg: 14.5, reps: 8 }, // e1RM ≒ 18.4 → PR
      { setNumber: 3, weightKg: 13, reps: 12 }, // e1RM ≒ 18.2 → PR(同重量レップ更新)
    ]
    expect(detectPrSetNumbers(today, past)).toEqual([2, 3])
  })

  it('過去実績のない種目はPR扱いしない(初回が全部PRになるのを避ける)', () => {
    expect(detectPrSetNumbers([{ setNumber: 1, weightKg: 20, reps: 10 }], [])).toEqual([])
  })

  it('自重種目はレップ数の自己新で判定', () => {
    const today = [{ setNumber: 1, reps: 21 }]
    expect(detectPrSetNumbers(today, [{ reps: 20 }])).toEqual([1])
    expect(detectPrSetNumbers(today, [{ reps: 21 }])).toEqual([])
  })

  it('setScoreはダンベル=推定1RM、自重=レップ数', () => {
    expect(setScore({ weightKg: 45, reps: 7 })).toBeCloseTo(55.5, 5)
    expect(setScore({ reps: 15 })).toBe(15)
  })
})

describe('summarizeExercise(前回比)', () => {
  it('ベストセット・ボリューム・前回比を算出する', () => {
    const summary = summarizeExercise({
      exerciseId: 1,
      todaySets: [
        { setNumber: 1, weightKg: 13, reps: 10 },
        { setNumber: 2, weightKg: 13, reps: 8 },
      ],
      pastSets: [{ weightKg: 11.5, reps: 10 }],
      prevSessionSets: [
        { weightKg: 11.5, reps: 10 },
        { weightKg: 11.5, reps: 9 },
      ],
    })
    expect(summary.todayBest?.setNumber).toBe(1)
    expect(summary.todayVolume).toBe(13 * 10 + 13 * 8)
    expect(summary.prevVolume).toBe(11.5 * 10 + 11.5 * 9)
    expect(summary.prevBest).toEqual({ weightKg: 11.5, reps: 10 })
    expect(summary.prSetNumbers).toEqual([1, 2])
  })

  it('前回セッションがなければprev系はnull', () => {
    const summary = summarizeExercise({
      exerciseId: 1,
      todaySets: [{ setNumber: 1, reps: 15 }],
      pastSets: [],
      prevSessionSets: [],
    })
    expect(summary.prevVolume).toBeNull()
    expect(summary.prevBest).toBeNull()
    expect(summary.todayVolume).toBe(15)
  })
})

// ===== 最近の自己ベスト一覧(ISS-026) =====
import { recentPrHistory } from './summary'
import type { GrowthSessionInput } from './growth'

function prSession(
  exerciseId: number,
  name: string,
  daysAgo: number,
  sets: { weightKg?: number; reps: number }[],
): GrowthSessionInput {
  return {
    performedAt: new Date(Date.now() - daysAgo * 24 * 3_600_000),
    exerciseId,
    exerciseName: name,
    muscle: 'chest',
    sets,
  }
}

describe('recentPrHistory(ISS-026): ログからのPR導出', () => {
  it('初回セッションはPR扱いしない(既存判定と同じ規則)', () => {
    expect(recentPrHistory([prSession(1, 'ベンチ', 1, [{ weightKg: 13, reps: 8 }])])).toEqual([])
  })

  it('過去ベスト超えのセッションから最良スコアのPRセット1件を採用・日付降順', () => {
    const result = recentPrHistory([
      prSession(1, 'ベンチ', 20, [{ weightKg: 13, reps: 8 }]),
      prSession(1, 'ベンチ', 10, [{ weightKg: 14.5, reps: 8 }, { weightKg: 14.5, reps: 10 }]), // 両方PR→10回側
      prSession(2, 'ロウ', 5, [{ weightKg: 16, reps: 8 }]), // 初回=PRなし
      prSession(2, 'ロウ', 1, [{ weightKg: 17.5, reps: 8 }]),
    ])
    expect(result).toHaveLength(2)
    expect(result[0].exerciseName).toBe('ロウ')
    expect(result[0].weightKg).toBe(17.5)
    expect(result[1].exerciseName).toBe('ベンチ')
    expect(result[1].reps).toBe(10)
  })

  it('自重種目(重量なし)はレップでPR判定される', () => {
    const result = recentPrHistory([
      prSession(9, 'プランク', 10, [{ reps: 30 }]),
      prSession(9, 'プランク', 1, [{ reps: 40 }]),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].weightKg).toBeUndefined()
    expect(result[0].reps).toBe(40)
  })

  it('更新のないセッション・limit超過分は含まれない', () => {
    const sessions: GrowthSessionInput[] = [prSession(1, 'ベンチ', 30, [{ weightKg: 13, reps: 8 }])]
    for (let i = 0; i < 8; i++) {
      sessions.push(prSession(1, 'ベンチ', 25 - i * 3, [{ weightKg: 14.5 + i * 1.5, reps: 8 }]))
    }
    sessions.push(prSession(1, 'ベンチ', 0.5, [{ weightKg: 10, reps: 5 }])) // 更新なし
    const result = recentPrHistory(sessions, 5)
    expect(result).toHaveLength(5)
    // 更新なしセッションは含まれない(最新エントリはPR時のもの)
    expect(result[0].weightKg).toBeGreaterThan(20)
  })
})
