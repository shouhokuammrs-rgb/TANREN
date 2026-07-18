// 重量・レップ提案(要件F-04-4): ダブルプログレッション。
// レップ上限到達→次の重量ステップへ増量してレップ下限から再開。初回種目は保守的に開始。

import {
  DEFAULT_INITIAL_WEIGHT_FACTOR,
  MAX_CONSECUTIVE_DOUBLE_JUMPS,
  SLACK_JUMP_STEPS,
} from '../constants/engine'
import type { Exercise, MovementPattern } from '../db/types'
import { calibratedWeightKg } from './calibration'
import type { ExerciseHistoryEntry } from './types'

/**
 * 希望重量を器具設定の刻みにスナップする。
 * down: 希望以下で最大の値(保守的)。up: 希望超で最小の値(増量時)。
 * nearest: 最も近い値(キャリブレーション初期値用・ISS-013a。同距離なら軽い方)
 */
export function snapToSteps(
  desiredKg: number,
  stepsKg: number[],
  mode: 'down' | 'up' | 'nearest',
): number {
  if (stepsKg.length === 0) {
    throw new Error('stepsKg must not be empty')
  }
  const sorted = [...stepsKg].sort((a, b) => a - b)
  if (mode === 'down') {
    const candidates = sorted.filter((s) => s <= desiredKg)
    return candidates.length > 0 ? candidates[candidates.length - 1] : sorted[0]
  }
  if (mode === 'up') {
    const above = sorted.find((s) => s > desiredKg)
    return above ?? sorted[sorted.length - 1]
  }
  return sorted.reduce((best, s) =>
    Math.abs(s - desiredKg) < Math.abs(best - desiredKg) ? s : best,
  )
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
  if (calibrated !== undefined) {
    // キャリブレーション由来は実測に基づくため最寄りの刻みへ(ISS-013a)
    return snapToSteps(calibrated, stepsKg, 'nearest')
  }
  const factor = exercise.initialWeightFactor ?? DEFAULT_INITIAL_WEIGHT_FACTOR
  // 体重比デフォルトは根拠が弱いため従来どおり下方向(保守的)
  return snapToSteps(bodyWeightKg * factor, stepsKg, 'down')
}

export interface WeightRepsSuggestion {
  weightKg?: number
  reps: number
}

/** ソート済み刻み配列上のインデックス(刻み外の重量は下方向スナップ相当) */
function stepIndexOf(weightKg: number, sortedSteps: number[]): number {
  let index = -1
  for (let i = 0; i < sortedSteps.length; i++) {
    if (sortedSteps[i] <= weightKg) index = i
  }
  return index
}

/**
 * 直近から遡って「2ステップ以上の増量」が何回連続しているか(ISS-013b暴走防止)。
 * chainは新しい順のセッション重量列
 */
function consecutiveDoubleJumps(chainWeightsKg: number[], sortedSteps: number[]): number {
  let count = 0
  for (let i = 0; i + 1 < chainWeightsKg.length; i++) {
    const diff =
      stepIndexOf(chainWeightsKg[i], sortedSteps) - stepIndexOf(chainWeightsKg[i + 1], sortedSteps)
    if (diff >= SLACK_JUMP_STEPS) count++
    else break
  }
  return count
}

/**
 * 直近実績からダブルプログレッションで次回の重量・レップを提案する。
 * - 実績なし: 初期重量+レップ下限
 * - 全セット達成かつレップ上限到達: 次の重量ステップ+レップ下限
 *   (「余裕あり」付きなら2ステップ増量。ただし連続2回まで: ISS-013b)
 * - 全セット達成: 同重量でレップ+1(「余裕あり」単独では増量しない=レップ先行の原則)
 * - 未達成あり: 同重量・同レップで再挑戦
 */
export function suggestWeightReps(
  exercise: Exercise,
  last: ExerciseHistoryEntry | undefined,
  bodyWeightKg: number,
  stepsKg: number[],
  patternBase1Rm: Partial<Record<MovementPattern, number>> = {},
  olderEntries: ExerciseHistoryEntry[] = [],
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
  // 「限界でした」(ISS-004)が付いた回は、達成していても増量・レップ加算を保留して様子を見る
  const anyAtFailure = recordedSets.some((s) => s.atFailure === true)
  const lastWeight = usesDumbbell ? recordedSets[0].weightKg : undefined
  // 過去ログの重量が現在の刻みに存在しない場合(器具設定変更後)もスナップし直す
  const currentWeight =
    usesDumbbell && lastWeight !== undefined ? snapToSteps(lastWeight, stepsKg, 'down') : undefined

  if (anyAtFailure) {
    return {
      weightKg: currentWeight,
      reps: Math.min(repRangeMax, Math.max(repRangeMin, minReps)),
    }
  }

  if (allAchieved && minReps >= repRangeMax) {
    if (!usesDumbbell || currentWeight === undefined) {
      // 自重種目は上限で頭打ち(Phase 2以降で難易度バリエーション対応を検討)
      return { reps: repRangeMax }
    }
    // 「余裕あり」(ISS-013b): 上限到達+余裕なら2ステップ増量。ただし連続2回まで
    const anySlack = recordedSets.some((s) => s.hadSlack === true)
    const sorted = [...stepsKg].sort((a, b) => a - b)
    const pastWeights = [
      currentWeight,
      ...olderEntries
        .map((e) => e.sets.find((s) => s.weightKg !== undefined)?.weightKg)
        .filter((w): w is number => w !== undefined),
    ]
    const jumpSteps =
      anySlack && consecutiveDoubleJumps(pastWeights, sorted) < MAX_CONSECUTIVE_DOUBLE_JUMPS
        ? SLACK_JUMP_STEPS
        : 1
    let nextWeight = currentWeight
    for (let i = 0; i < jumpSteps; i++) {
      nextWeight = snapToSteps(nextWeight, stepsKg, 'up')
    }
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
