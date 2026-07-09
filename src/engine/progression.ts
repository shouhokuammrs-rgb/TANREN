// 重量・レップ提案(要件F-04-4): ダブルプログレッション。
// レップ上限到達→次の重量ステップへ増量してレップ下限から再開。初回種目は保守的に開始。

import { DEFAULT_INITIAL_WEIGHT_FACTOR } from '../constants/engine'
import type { Exercise, MovementPattern } from '../db/types'
import { calibratedWeightKg } from './calibration'
import type { ExerciseHistoryEntry } from './types'

/**
 * 希望重量を器具設定の刻みにスナップする。
 * down: 希望以下で最大の値(保守的)。up: 希望超で最小の値(増量時)
 */
export function snapToSteps(desiredKg: number, stepsKg: number[], mode: 'down' | 'up'): number {
  if (stepsKg.length === 0) {
    throw new Error('stepsKg must not be empty')
  }
  const sorted = [...stepsKg].sort((a, b) => a - b)
  if (mode === 'down') {
    const candidates = sorted.filter((s) => s <= desiredKg)
    return candidates.length > 0 ? candidates[candidates.length - 1] : sorted[0]
  }
  const above = sorted.find((s) => s > desiredKg)
  return above ?? sorted[sorted.length - 1]
}

/**
 * 初回種目の保守的初期重量。自重種目はundefined。
 * 優先順(ISS-002): 筋力キャリブレーション値 > 体重比デフォルト。いずれも下方向スナップ
 */
export function initialWeightKg(
  exercise: Exercise,
  bodyWeightKg: number,
  stepsKg: number[],
  patternBase1Rm: Partial<Record<MovementPattern, number>> = {},
): number | undefined {
  if (!exercise.requiredEquipment.includes('dumbbell')) return undefined
  const calibrated = calibratedWeightKg(exercise, patternBase1Rm)
  const factor = exercise.initialWeightFactor ?? DEFAULT_INITIAL_WEIGHT_FACTOR
  return snapToSteps(calibrated ?? bodyWeightKg * factor, stepsKg, 'down')
}

export interface WeightRepsSuggestion {
  weightKg?: number
  reps: number
}

/**
 * 直近実績からダブルプログレッションで次回の重量・レップを提案する。
 * - 実績なし: 初期重量+レップ下限
 * - 全セット達成かつレップ上限到達: 次の重量ステップ+レップ下限
 * - 全セット達成: 同重量でレップ+1
 * - 未達成あり: 同重量・同レップで再挑戦
 */
export function suggestWeightReps(
  exercise: Exercise,
  last: ExerciseHistoryEntry | undefined,
  bodyWeightKg: number,
  stepsKg: number[],
  patternBase1Rm: Partial<Record<MovementPattern, number>> = {},
): WeightRepsSuggestion {
  const usesDumbbell = exercise.requiredEquipment.includes('dumbbell')
  const { repRangeMin, repRangeMax } = exercise

  const recordedSets = last?.sets.filter((s) => s.reps !== undefined) ?? []
  if (recordedSets.length === 0) {
    return {
      weightKg: usesDumbbell
        ? initialWeightKg(exercise, bodyWeightKg, stepsKg, patternBase1Rm)
        : undefined,
      reps: repRangeMin,
    }
  }

  const minReps = Math.min(...recordedSets.map((s) => s.reps!))
  const allAchieved = recordedSets.every((s) => s.achieved !== false)
  const lastWeight = usesDumbbell ? recordedSets[0].weightKg : undefined
  // 過去ログの重量が現在の刻みに存在しない場合(器具設定変更後)もスナップし直す
  const currentWeight =
    usesDumbbell && lastWeight !== undefined ? snapToSteps(lastWeight, stepsKg, 'down') : undefined

  if (allAchieved && minReps >= repRangeMax) {
    if (!usesDumbbell || currentWeight === undefined) {
      // 自重種目は上限で頭打ち(Phase 2以降で難易度バリエーション対応を検討)
      return { reps: repRangeMax }
    }
    const nextWeight = snapToSteps(currentWeight, stepsKg, 'up')
    if (nextWeight > currentWeight) {
      return { weightKg: nextWeight, reps: repRangeMin }
    }
    // すでに最大重量: 同重量でレップ上限を維持
    return { weightKg: currentWeight, reps: repRangeMax }
  }

  if (allAchieved) {
    return {
      weightKg: currentWeight,
      reps: Math.min(repRangeMax, Math.max(repRangeMin, minReps + 1)),
    }
  }

  // 未達成: 同じ目標で再挑戦
  return {
    weightKg: currentWeight,
    reps: Math.min(repRangeMax, Math.max(repRangeMin, minReps)),
  }
}
