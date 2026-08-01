// 部位別ゴールモデル(DEC-013 / Phase 7-5a・7-5b)のユニットテスト
import { describe, expect, it } from 'vitest'
import type { MuscleGoal } from '../db/types'
import {
  chartGoalLineKg,
  coefForDirectEdit,
  detectReachedGoals,
  equipmentE1RmCap,
  goalGapRatio,
  goalPriority,
  goalPriorityScores,
  goalProgress,
  goalTrendByMuscle,
  isCapped,
  nextGoalLevel,
  raiseSuggestionKg,
  targetE1Rm,
} from './goal'
import type { GrowthSessionInput } from './growth'

const STEPS = [2.5, 4, 5.5, 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5, 22, 24]

describe('targetE1Rm / equipmentE1RmCap(DEC-013)', () => {
  it('ゴール = 体重 × 係数(小数第1位)', () => {
    expect(targetE1Rm(0.5, 70)).toBe(35)
    expect(targetE1Rm(0.35, 68.5)).toBeCloseTo(24, 1)
  })

  it('器具上限はハードコードせず導出: 24kg → 33.6kg(レップ12クランプ)', () => {
    expect(equipmentE1RmCap(STEPS)).toBeCloseTo(33.6, 5)
    // 器具拡張(30kg)に自動追従
    expect(equipmentE1RmCap([...STEPS, 30])).toBeCloseTo(42, 5)
    expect(equipmentE1RmCap([])).toBe(0)
  })

  it('capped境界: 33.6ちょうどは届く・超えたらcapped', () => {
    const cap = equipmentE1RmCap(STEPS)
    expect(isCapped(33.6, cap)).toBe(false)
    expect(isCapped(33.7, cap)).toBe(true)
    // 体重70kg×胸しっかり(0.50)=35 → capped(仕様書§1の例)
    expect(isCapped(targetE1Rm(0.5, 70), cap)).toBe(true)
  })
})

describe('coefForDirectEdit(直接編集の係数化)', () => {
  it('編集kg ÷ 編集時点体重 を保存し、体重変更でゴールが追従する', () => {
    const coef = coefForDirectEdit(30, 60)
    expect(coef).toBeCloseTo(0.5, 5)
    // 体重が62kgに増えるとゴールも自動追従(固定kg保存禁止の狙い)
    expect(targetE1Rm(coef, 62)).toBeCloseTo(31, 1)
  })
})

describe('goalProgress(進捗軸: スタート→現在→ゴール)', () => {
  it('ratio = (現在−スタート)/(ゴール−スタート)を0〜1にクランプ', () => {
    expect(goalProgress(10, 20, 30)).toEqual({ ratio: 0.5, remainingKg: 10 })
    expect(goalProgress(10, 5, 30)?.ratio).toBe(0) // 後退は0で下限クランプ
    expect(goalProgress(10, 40, 30)).toEqual({ ratio: 1, remainingKg: 0 })
  })

  it('start ≧ target は即1.0', () => {
    expect(goalProgress(35, 35, 30)?.ratio).toBe(1)
  })

  it('start/currentが導出できない部位はundefined(進捗未表示・ゴールのみ)', () => {
    expect(goalProgress(undefined, 20, 30)).toBeUndefined()
    expect(goalProgress(10, undefined, 30)).toBeUndefined()
  })
})

describe('動的優先度(F-03置き換え)', () => {
  it('gapRatio→係数マッピング: clamp(0.4 + 1.2×gap, 0.4, 1.6)', () => {
    expect(goalPriority(0)).toBeCloseTo(0.4, 5) // ゴール到達済み
    expect(goalPriority(0.5)).toBeCloseTo(1.0, 5)
    expect(goalPriority(1)).toBeCloseTo(1.6, 5) // 実績ゼロ=ギャップ最大
    expect(goalPriority(2)).toBeCloseTo(1.6, 5) // 上限クランプ
  })

  it('gapRatio: 現在値未導出はギャップ最大(1)扱い・超過は0', () => {
    expect(goalGapRatio(30, undefined)).toBe(1)
    expect(goalGapRatio(30, 15)).toBeCloseTo(0.5, 5)
    expect(goalGapRatio(30, 35)).toBe(0)
  })

  it('goalPriorityScores: growth=f(ギャップ)/maintain=固定0.4/未設定・対象外=中立1.0', () => {
    const scores = goalPriorityScores(
      [
        { muscle: 'chest', coef: 0.5, mode: 'growth' }, // 目標29 現在14.5 → gap0.5 → 1.0
        { muscle: 'back', coef: 0.5, mode: 'maintain' },
      ],
      58,
      { chest: 14.5 },
    )
    expect(scores.chest).toBeCloseTo(1.0, 2)
    expect(scores.back).toBe(0.4)
    expect(scores.shoulders).toBe(1) // ゴール未設定→中立
    expect(scores.abs).toBe(1) // 対象外部位→中立
    expect(scores.glutes).toBe(1)
  })
})

describe('goalTrendByMuscle(スタート導出値・保存しない)', () => {
  function press(daysAgo: number, weightKg: number): GrowthSessionInput {
    return {
      performedAt: new Date(Date.now() - daysAgo * 24 * 3_600_000),
      exerciseId: 1,
      exerciseName: 'ダンベルベンチプレス',
      muscle: 'chest',
      sets: [{ weightKg, reps: 10 }],
    }
  }

  it('基準種目の全期間最古の実ログe1RMがスタート・最新が現在', () => {
    const trend = goalTrendByMuscle(
      [press(200, 8.5), press(30, 11.5), press(2, 14.5)],
      new Date(),
    )
    expect(trend.chest?.startE1Rm).toBeCloseTo(8.5 * (1 + 10 / 30), 5)
    expect(trend.chest?.currentE1Rm).toBeCloseTo(14.5 * (1 + 10 / 30), 5)
  })

  it('実ログゼロの部位はundefined、自重種目(レップ指標)のセッションは対象外', () => {
    const bodyweightOnly: GrowthSessionInput = {
      performedAt: new Date(),
      exerciseId: 6,
      exerciseName: 'プッシュアップ',
      muscle: 'chest',
      bodyweight: true,
      sets: [{ reps: 15 }],
    }
    const trend = goalTrendByMuscle([bodyweightOnly], new Date())
    expect(trend.chest).toBeUndefined()
    expect(trend.back).toBeUndefined()
  })
})

// ===== Phase 7-5b: 到達判定と鏡チェック =====

function goalOf(partial: Partial<MuscleGoal> & Pick<MuscleGoal, 'muscle' | 'coef'>): MuscleGoal {
  return { level: 'toned', mode: 'growth', updatedAt: new Date(), ...partial }
}

describe('detectReachedGoals(セッション保存時の到達検知)', () => {
  // 体重58kg × 係数0.25 = 目標14.5kg
  const goals = [goalOf({ muscle: 'chest', coef: 0.25 })]

  it('境界: current === target も到達', () => {
    expect(detectReachedGoals(goals, 58, { chest: 14.5 }, ['chest'])).toEqual(['chest'])
    expect(detectReachedGoals(goals, 58, { chest: 14.4 }, ['chest'])).toEqual([])
  })

  it('maintain部位は判定対象外', () => {
    const maintain = [goalOf({ muscle: 'chest', coef: 0.25, mode: 'maintain' })]
    expect(detectReachedGoals(maintain, 58, { chest: 20 }, ['chest'])).toEqual([])
  })

  it('reachedAt残留(判定未消化)の部位は再検知しない=重複記録抑止', () => {
    const pending = [goalOf({ muscle: 'chest', coef: 0.25, reachedAt: new Date() })]
    expect(detectReachedGoals(pending, 58, { chest: 20 }, ['chest'])).toEqual([])
  })

  it('このセッションで記録していない部位・現在値未導出の部位は判定しない', () => {
    expect(detectReachedGoals(goals, 58, { chest: 20 }, ['back'])).toEqual([])
    expect(detectReachedGoals(goals, 58, {}, ['chest'])).toEqual([])
  })
})

describe('nextGoalLevel / raiseSuggestionKg(物足りない)', () => {
  it('1段引き上げ: light→toned→solid→big→null(DEC-016で4段化)', () => {
    expect(nextGoalLevel('light')).toBe('toned')
    expect(nextGoalLevel('toned')).toBe('solid')
    expect(nextGoalLevel('solid')).toBe('big')
    expect(nextGoalLevel('big')).toBeNull()
  })

  it('big到達の提案値: 現目標+10%を0.5kg刻みで丸める', () => {
    expect(raiseSuggestionKg(29)).toBe(32) // 31.9 → 32
    expect(raiseSuggestionKg(20)).toBe(22)
    expect(raiseSuggestionKg(30.5)).toBe(33.5) // 33.55 → 33.5
  })
})

describe('chartGoalLineKg(指標乖離ルール・§1)', () => {
  it('e1RMグラフにはゴールラインを描く', () => {
    expect(chartGoalLineKg('e1rm', 18)).toBe(18)
  })

  it('レップ指標(ISS-018)のグラフにはkg線を重ねない', () => {
    expect(chartGoalLineKg('reps', 18)).toBeUndefined()
  })
})

// ===== DEC-016: ゴール第4段「ひかえめ」 =====
import { GOAL_COEF } from '../constants/goals'

describe('ひかえめ係数(DEC-016・Strength Level Beginner)', () => {
  it('係数表: 胸0.20/背中0.20/肩0.15/腕0.10/脚0.15', () => {
    expect(GOAL_COEF.chest.light).toBe(0.2)
    expect(GOAL_COEF.back.light).toBe(0.2)
    expect(GOAL_COEF.shoulders.light).toBe(0.15)
    expect(GOAL_COEF.arms.light).toBe(0.1)
    expect(GOAL_COEF.legs.light).toBe(0.15)
  })

  it('目標計算: 体重58kgで胸11.6kg・腕5.8kg', () => {
    expect(targetE1Rm(GOAL_COEF.chest.light, 58)).toBe(11.6)
    expect(targetE1Rm(GOAL_COEF.arms.light, 58)).toBe(5.8)
  })

  it('ひかえめは全体重域(40-120kg)でcappedにならない', () => {
    const cap = equipmentE1RmCap(STEPS)
    for (const muscle of ['chest', 'back', 'shoulders', 'arms', 'legs'] as const) {
      expect(isCapped(targetE1Rm(GOAL_COEF[muscle].light, 120), cap)).toBe(false)
    }
  })
})

describe('腕ノッチ4個のX座標境界(DEC-016 §2-2)', () => {
  // 5b正規化: maxV = max(がっつり目標, cap) × 1.14 / トラック実効幅326px(390px画面)
  const TRACK_PX = 326
  function armsGapPx(w: number): number {
    const cap = equipmentE1RmCap(STEPS)
    const maxV = Math.max(GOAL_COEF.arms.big * w, cap) * 1.14
    const light = (GOAL_COEF.arms.light * w) / maxV
    const toned = (GOAL_COEF.arms.toned * w) / maxV
    return (toned - light) * TRACK_PX
  }

  it('第1(ひかえめ)↔第2(引き締め)の中心間隔は42.3kgでちょうど18px(境界)', () => {
    expect(armsGapPx(42.3)).toBeCloseTo(18, 1)
  })

  it('42.3kg未満のみ18px円が接触・Owner域(58kg)は24px超で問題なし', () => {
    expect(armsGapPx(40)).toBeLessThan(18)
    expect(armsGapPx(58)).toBeGreaterThan(24)
    expect(armsGapPx(70)).toBeGreaterThan(28)
  })
})
