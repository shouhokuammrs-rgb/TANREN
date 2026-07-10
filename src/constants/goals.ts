import type { AvoidReason, GoalType, MuscleGroup } from '../db/types'

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
