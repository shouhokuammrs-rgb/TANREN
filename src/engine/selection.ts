// 部位決定(F-04-2)と種目選択(F-04-3)

import {
  FRESHNESS_READY_THRESHOLD,
  FRESHNESS_WARN_THRESHOLD,
  MAX_EXERCISES_PER_MUSCLE,
  MUSCLES_BY_TIME,
  TIRED_AVOID_REP_MAX,
} from '../constants/engine'
import { freshnessBucketOf } from '../constants/charts'
import { FRESHNESS_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { Condition, Exercise, MuscleGroup } from '../db/types'
import type { EngineContext } from './types'

/** 使える時間から同時に狙う部位数を決める */
export function muscleCountForTime(availableMinutes: number): number {
  const entry = MUSCLES_BY_TIME.find((e) => availableMinutes <= e.maxMinutes)
  return entry ? entry.muscleCount : 1
}

/** おまかせで除外した回復中部位(UIの短縮理由表示に使う・DEC-006) */
export interface ExcludedRecoveringMuscle {
  muscle: MuscleGroup
  freshness: number
}

export interface MuscleSelection {
  muscles: MuscleGroup[]
  warnings: string[]
  /** おまかせで除外した回復中(フレッシュネス100%未満)の部位。回復が進んでいる順 */
  excludedRecovering: ExcludedRecoveringMuscle[]
  /** おまかせで全部位が回復中→休養日を提案(DEC-006) */
  isRestDay: boolean
}

/**
 * 対象部位を決める。
 * - 痛みフラグの部位は指定・おまかせ問わず除外(警告を出す)
 * - おまかせ(DEC-006: 時間希望より回復を優先): 完全回復(READY閾値以上)の部位のみを
 *   優先度順で選ぶ。要求部位数に満たなくても回復中部位で繰り上げ補充はしない。
 *   全部位が回復中なら休養日を提案する(isRestDay)
 * - 指定: そのまま採用しつつ、フレッシュネス不足には警告(ユーザー判断を尊重)
 */
export function selectMuscles(
  ctx: EngineContext,
  targetMuscles: MuscleGroup[],
  availableMinutes: number,
  freshness: Record<MuscleGroup, number>,
): MuscleSelection {
  const warnings: string[] = []
  const injured = new Set(ctx.activeInjuries)

  if (targetMuscles.length > 0) {
    const usable = targetMuscles.filter((m) => !injured.has(m))
    for (const m of targetMuscles) {
      if (injured.has(m)) {
        warnings.push(`${MUSCLE_GROUP_LABELS[m]}は痛みフラグがあるため除外しました`)
      } else if (freshness[m] < FRESHNESS_WARN_THRESHOLD) {
        // ISS-011: 選択時インライン注意と同じ状態語(回復中/休息推奨)で整合させる
        warnings.push(
          FRESHNESS_COPY.generatedWarning(
            MUSCLE_GROUP_LABELS[m],
            freshnessBucketOf(freshness[m]).label,
            freshness[m],
          ),
        )
      }
    }
    return { muscles: usable, warnings, excludedRecovering: [], isRestDay: false }
  }

  // おまかせ: 優先度スコア(F-03)×フレッシュネス の降順(優先度未設定は全部位1.0)
  const priority = ctx.priorityScores
  const combined = (m: MuscleGroup) => freshness[m] * (priority?.[m] ?? 1)
  const all = Object.keys(freshness) as MuscleGroup[]
  const candidates = all
    .filter((m) => !injured.has(m))
    .sort((a, b) => combined(b) - combined(a))
  const count = muscleCountForTime(availableMinutes)

  // 回復下限は上級者設定(DEC-010)で上書き可能
  const readyThreshold = ctx.tuning?.freshnessReadyThreshold ?? FRESHNESS_READY_THRESHOLD
  const fresh = candidates.filter((m) => freshness[m] >= readyThreshold)
  const selected = fresh.slice(0, count)
  const excludedRecovering = candidates
    .filter((m) => freshness[m] < readyThreshold)
    .map((m) => ({ muscle: m, freshness: freshness[m] }))
    .sort((a, b) => b.freshness - a.freshness)

  return {
    muscles: selected,
    warnings,
    excludedRecovering,
    // 選べる部位がゼロ=全部位回復中(候補自体がない場合は休養ではなく設定の問題なので除く)
    isRestDay: selected.length === 0 && candidates.length > 0,
  }
}

/** 器具設定(ダンベル有無・ベンチ角度範囲)で実施可能かを判定する */
export function isExerciseAvailable(exercise: Exercise, ctx: EngineContext): boolean {
  for (const eq of exercise.requiredEquipment) {
    if (eq === 'dumbbell' && ctx.dumbbellStepsKg.length === 0) return false
    if (eq === 'bench') {
      if (!ctx.bench) return false
      const angle = exercise.benchAngleDeg
      if (
        angle !== undefined &&
        (angle < ctx.bench.minAngleDeg || angle > ctx.bench.maxAngleDeg)
      ) {
        return false
      }
    }
  }
  return true
}

/**
 * 対象部位ごとの種目候補(優先順)。
 * コンパウンド優先→実績のある種目優先。痛みフラグ部位に触れる種目は除外
 */
export function candidatesByMuscle(
  ctx: EngineContext,
  muscles: MuscleGroup[],
  condition: Condition,
): Map<MuscleGroup, Exercise[]> {
  const injured = new Set(ctx.activeInjuries)
  const result = new Map<MuscleGroup, Exercise[]>()
  for (const muscle of muscles) {
    const list = ctx.exercises
      .filter((e) => e.isActive === 1 && e.primaryMuscle === muscle)
      .filter((e) => isExerciseAvailable(e, ctx))
      .filter((e) => !e.muscleGroups.some((m) => injured.has(m)))
      // 疲れ気味: レップ上限が低い=高重量前提の種目を回避(F-04-6)
      .filter((e) => condition !== 'tired' || e.repRangeMax > TIRED_AVOID_REP_MAX)
      .sort((a, b) => {
        if (a.movementType !== b.movementType) {
          return a.movementType === 'compound' ? -1 : 1
        }
        const aHist = ctx.lastPerformance.has(a.id!) ? 0 : 1
        const bHist = ctx.lastPerformance.has(b.id!) ? 0 : 1
        if (aHist !== bHist) return aHist - bHist
        return a.id! - b.id!
      })
      .slice(0, MAX_EXERCISES_PER_MUSCLE)
    result.set(muscle, list)
  }
  return result
}
