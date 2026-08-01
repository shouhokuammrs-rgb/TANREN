import type { AvoidReason, GoalLevel, GoalType, MuscleGroup } from '../db/types'

// ギャップ分析(F-03)の定数。目標ボディテンプレートごとの部位優先度マップ。
// Eiichiの体感フィードバックで調整が入る前提の定数ファイル

/** 目標ボディ別の部位優先度(1.0=標準)。要件F-03の例に基づく */
export const GOAL_PRIORITY_MAP: Record<GoalType, Record<MuscleGroup, number>> = {
  // 細マッチョ: 肩・胸上部・腹・背中の広がり重視
  lean: {
    shoulders: 1.5,
    chest: 1.3,
    abs: 1.5,
    back: 1.3,
    arms: 1.0,
    legs: 0.9,
    glutes: 0.9,
  },
  // バルクアップ: 大筋群優先で全身の筋量最大化
  bulk: {
    chest: 1.4,
    back: 1.4,
    legs: 1.4,
    glutes: 1.2,
    shoulders: 1.1,
    arms: 1.1,
    abs: 0.8,
  },
  // 体力・健康維持: 全身バランス
  health: {
    chest: 1.0,
    back: 1.1,
    legs: 1.1,
    glutes: 1.0,
    shoulders: 1.0,
    arms: 0.9,
    abs: 1.0,
  },
  // 部位特化: focusPartsをFOCUS_BOOSTで引き上げる(ベースは控えめ)
  focus: {
    chest: 0.9,
    back: 0.9,
    legs: 0.9,
    glutes: 0.9,
    shoulders: 0.9,
    arms: 0.9,
    abs: 0.9,
  },
}

/** 部位特化(focus)で選んだ部位に掛ける倍率 */
export const FOCUS_BOOST = 1.8

/** 「鍛えたい部位」に掛ける倍率 */
export const WANT_BOOST = 1.25

/** 「鍛えたくない部位」の理由タグ別倍率(injuryはinjuriesテーブルで完全回避されるためここでは強め減衰のみ) */
export const AVOID_FACTOR: Record<AvoidReason, number> = {
  injury: 0.3,
  dislike: 0.4,
  developed: 0.6,
}

/** 週あたり推奨セット数: 優先度1.0あたりの基準セット数(スコア×基準を丸める) */
export const WEEKLY_SETS_PER_PRIORITY = 8
/** 週あたり推奨セット数の上限(回復可能な範囲) */
export const WEEKLY_SETS_MAX = 16

// ===== 部位別ゴールモデル(DEC-013 / Phase 7) =====

/** ゴール対象部位の型(尻・腹は対象外) */
export type GoalTargetMuscle = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs'

/** ゴール対象部位(表示順) */
export const GOAL_TARGET_MUSCLES: GoalTargetMuscle[] = ['chest', 'back', 'shoulders', 'arms', 'legs']

/** ゴール対象部位かの判定(尻・腹・未対象を除外) */
export function isGoalTargetMuscle(muscle: MuscleGroup): muscle is GoalTargetMuscle {
  return (GOAL_TARGET_MUSCLES as readonly MuscleGroup[]).includes(muscle)
}

/**
 * レベル別の体重比係数(Strength Level基準・研究資料§3の承認済み係数表)。
 * ゴールe1RM = 体重 × 係数(片手kg)。体感フィードバックで調整が入る前提
 */
export const GOAL_COEF: Record<GoalTargetMuscle, Record<GoalLevel, number>> = {
  chest: { toned: 0.35, solid: 0.5, big: 0.7 },
  back: { toned: 0.35, solid: 0.55, big: 0.75 },
  shoulders: { toned: 0.25, solid: 0.4, big: 0.55 },
  arms: { toned: 0.15, solid: 0.3, big: 0.5 },
  legs: { toned: 0.25, solid: 0.4, big: 0.6 },
}

/** 年齢係数(v1は1.0固定。将来の調整用に定数として保持) */
export const GOAL_AGE_FACTOR = 1.0

// 動的優先度(F-03置き換え): 優先度 = clamp(BASE + SLOPE × gapRatio, MIN, MAX)
export const GOAL_PRIORITY_BASE = 0.4
export const GOAL_PRIORITY_SLOPE = 1.2
export const GOAL_PRIORITY_MIN = 0.4
export const GOAL_PRIORITY_MAX = 1.6
/** 維持モードの固定優先度 */
export const GOAL_MAINTAIN_PRIORITY = 0.4
