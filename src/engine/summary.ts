// セッション後サマリー+PR検出(F-07)。UI非依存の純関数

import { epley1Rm } from './calibration'

export interface CompletedSetInput {
  setNumber: number
  weightKg?: number
  reps: number
}

export interface PastSetInput {
  weightKg?: number
  reps: number
}

/**
 * セットの強さスコア。ダンベル種目は推定1RM、自重種目はレップ数。
 * PR判定・ベストセット比較の共通ものさし
 */
export function setScore(set: PastSetInput): number {
  return set.weightKg !== undefined && set.weightKg > 0
    ? epley1Rm(set.weightKg, set.reps)
    : set.reps
}

/**
 * PR(自己新)判定: 過去の全セットの最高スコアを上回ったセット。
 * 過去実績のない種目は比較対象がないためPR扱いしない(初回が全部PRになるのを避ける)
 */
export function detectPrSetNumbers(
  todaySets: CompletedSetInput[],
  pastSets: PastSetInput[],
): number[] {
  if (pastSets.length === 0) return []
  const pastBest = Math.max(...pastSets.map(setScore))
  return todaySets.filter((s) => setScore(s) > pastBest).map((s) => s.setNumber)
}

export interface ExerciseSummaryInput {
  exerciseId: number
  todaySets: CompletedSetInput[]
  /** このセッションより前の全完了セット */
  pastSets: PastSetInput[]
  /** 直近の前回セッションでの完了セット(前回比用。なければ空) */
  prevSessionSets: PastSetInput[]
}

export interface ExerciseSummary {
  exerciseId: number
  prSetNumbers: number[]
  /** ベストセット(スコア最大)。今日の実施がなければnull */
  todayBest: CompletedSetInput | null
  prevBest: PastSetInput | null
  /** ボリューム = Σ重量×レップ(自重セットはΣレップ) */
  todayVolume: number
  prevVolume: number | null
}

function volume(sets: PastSetInput[]): number {
  return sets.reduce((sum, s) => sum + (s.weightKg !== undefined ? s.weightKg * s.reps : s.reps), 0)
}

function best<T extends PastSetInput>(sets: T[]): T | null {
  if (sets.length === 0) return null
  return sets.reduce((a, b) => (setScore(b) > setScore(a) ? b : a))
}

export function summarizeExercise(input: ExerciseSummaryInput): ExerciseSummary {
  return {
    exerciseId: input.exerciseId,
    prSetNumbers: detectPrSetNumbers(input.todaySets, input.pastSets),
    todayBest: best(input.todaySets),
    prevBest: best(input.prevSessionSets),
    todayVolume: Math.round(volume(input.todaySets) * 10) / 10,
    prevVolume:
      input.prevSessionSets.length > 0 ? Math.round(volume(input.prevSessionSets) * 10) / 10 : null,
  }
}
