// 初期筋力キャリブレーション(ISS-002)。UI非依存の純関数

import {
  PATTERN_BASELINE_FACTOR,
  REF_LIFTS,
  WORKING_WEIGHT_COEF,
} from '../constants/strength'
import { DEFAULT_INITIAL_WEIGHT_FACTOR } from '../constants/engine'
import type { Exercise, MovementPattern, StrengthMark } from '../db/types'

/** Epley式による推定1RM(指示書指定): 1RM = 重量 × (1 + レップ/30) */
export function epley1Rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) {
    throw new Error(`weightKg and reps must be positive: ${weightKg}kg × ${reps}`)
  }
  return weightKg * (1 + reps / 30)
}

/**
 * 筋力の目安の入力群から、動作パターンごとの基準1RM(バーベル相当)を算出する。
 * 同一基準種目は最新の入力を採用し、同一パターンに複数の基準種目があれば最大値を使う
 */
export function patternBase1RmFrom(
  marks: StrengthMark[],
): Partial<Record<MovementPattern, number>> {
  const refById = new Map(REF_LIFTS.map((r) => [r.id, r]))

  const latestByRef = new Map<string, StrengthMark>()
  for (const mark of marks) {
    const current = latestByRef.get(mark.refLiftId)
    if (!current || mark.recordedAt.getTime() > current.recordedAt.getTime()) {
      latestByRef.set(mark.refLiftId, mark)
    }
  }

  const result: Partial<Record<MovementPattern, number>> = {}
  for (const mark of latestByRef.values()) {
    const ref = refById.get(mark.refLiftId)
    if (!ref) continue
    const base = epley1Rm(mark.weightKg, mark.reps) * ref.toPatternBase
    result[ref.pattern] = Math.max(result[ref.pattern] ?? 0, base)
  }
  return result
}

/**
 * キャリブレーション由来の初期作業重量(片手・スナップ前)。
 * 対象パターンの基準1RMがない、または換算対象外パターンならundefined(体重比へフォールバック)
 */
export function calibratedWeightKg(
  exercise: Exercise,
  patternBase1Rm: Partial<Record<MovementPattern, number>>,
): number | undefined {
  if (!exercise.requiredEquipment.includes('dumbbell')) return undefined
  const base = patternBase1Rm[exercise.movementPattern]
  const coef = WORKING_WEIGHT_COEF[exercise.movementPattern]
  const baseline = PATTERN_BASELINE_FACTOR[exercise.movementPattern]
  if (base === undefined || coef === undefined || baseline === undefined) return undefined
  const relative = (exercise.initialWeightFactor ?? DEFAULT_INITIAL_WEIGHT_FACTOR) / baseline
  return base * coef * relative
}
