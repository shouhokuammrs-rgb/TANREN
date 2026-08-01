import type { GoalLevel, MuscleGroup } from '../db/types'

// 旧ギャップ分析(F-03)の定数群はISS-023で撤去(優先度はDEC-013の動的優先度が担う)

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
  chest: { light: 0.2, toned: 0.35, solid: 0.5, big: 0.7 },
  back: { light: 0.2, toned: 0.35, solid: 0.55, big: 0.75 },
  shoulders: { light: 0.15, toned: 0.25, solid: 0.4, big: 0.55 },
  arms: { light: 0.1, toned: 0.15, solid: 0.3, big: 0.5 },
  legs: { light: 0.15, toned: 0.25, solid: 0.4, big: 0.6 },
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
