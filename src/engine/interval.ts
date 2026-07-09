import {
  COMPOUND_BONUS_SEC,
  INTERVAL_TABLE,
  REP_THRESHOLDS,
  type TrainingPurpose,
} from '../constants/intervals'
import type { MovementType } from '../db/types'

/** 目標レップ数からトレーニング目的を判定する(要件F-04-5) */
export function purposeForReps(targetReps: number): TrainingPurpose {
  if (targetReps <= REP_THRESHOLDS.strengthMaxReps) return 'strength'
  if (targetReps <= REP_THRESHOLDS.hypertrophyMaxReps) return 'hypertrophy'
  return 'endurance'
}

/** 種目のインターバル秒数を決める。コンパウンド種目は+30秒 */
export function intervalSecFor(targetReps: number, movementType: MovementType): number {
  const base = INTERVAL_TABLE[purposeForReps(targetReps)]
  return movementType === 'compound' ? base + COMPOUND_BONUS_SEC : base
}
