// 部位決定(F-04-2)と種目選択(F-04-3)

import {
  FRESHNESS_WARN_THRESHOLD,
  MAX_EXERCISES_PER_MUSCLE,
  MUSCLES_BY_TIME,
  TIRED_AVOID_REP_MAX,
} from '../constants/engine'
import { MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { Condition, Exercise, MuscleGroup } from '../db/types'
import type { EngineContext } from './types'

/** 使える時間から同時に狙う部位数を決める */
export function muscleCountForTime(availableMinutes: number): number {
  const entry = MUSCLES_BY_TIME.find((e) => availableMinutes <= e.maxMinutes)
  return entry ? entry.muscleCount : 1
}

export interface MuscleSelection {
  muscles: MuscleGroup[]
  warnings: string[]
}

/**
 * 対象部位を決める。
 * - 痛みフラグの部位は指定・おまかせ問わず除外(警告を出す)
 * - おまかせ: フレッシュネス降順で時間に応じた部位数を選ぶ。全部位が疲労時も最善の部位を選び警告
 * - 指定: そのまま採用しつつ、フレッシュネス不足には警告
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
        warnings.push(
          `${MUSCLE_GROUP_LABELS[m]}は回復途中です(フレッシュネス${freshness[m]}%)。軽めを推奨`,
        )
      }
    }
    return { muscles: usable, warnings }
  }

  // おまかせ: フレッシュネス降順(同率は大筋群優先の登録順)
  const all = Object.keys(freshness) as MuscleGroup[]
  const candidates = all
    .filter((m) => !injured.has(m))
    .sort((a, b) => freshness[b] - freshness[a])
  const count = muscleCountForTime(availableMinutes)

  const fresh = candidates.filter((m) => freshness[m] >= FRESHNESS_WARN_THRESHOLD)
  let selected = fresh.slice(0, count)
  if (selected.length === 0 && candidates.length > 0) {
    // 全部位疲労: それでも最もフレッシュな部位を選び、警告を付ける
    selected = candidates.slice(0, 1)
    warnings.push(
      '全部位が回復途中です。最も回復している部位を軽めに刺激するメニューにしました',
    )
  }
  return { muscles: selected, warnings }
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
