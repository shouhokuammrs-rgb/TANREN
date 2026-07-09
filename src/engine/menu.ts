// メニュー生成エンジンv1(要件F-04)。
// 回復モデル→部位決定→種目選択→重量・レップ提案→インターバル→コンディション補正の順に組む。
// UI非依存の純関数。DBスナップショット(EngineContext)を受け取る。

import {
  CONDITION_VOLUME_FACTOR,
  DEFAULT_SETS,
  EXERCISE_SETUP_SEC,
  MIN_SETS,
  SET_EXEC_SEC,
} from '../constants/engine'
import { MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { Condition, Exercise, MuscleGroup } from '../db/types'
import { muscleFreshnessMap } from './freshness'
import { intervalSecFor } from './interval'
import { snapToSteps, suggestWeightReps } from './progression'
import { candidatesByMuscle, isExerciseAvailable, selectMuscles } from './selection'
import type { EngineContext, GeneratedMenu, MenuItem, MenuRequest, Prescription } from './types'

/** 1種目の所要時間見積り(秒) */
export function itemDurationSec(item: Pick<MenuItem, 'sets' | 'intervalSec'>): number {
  return EXERCISE_SETUP_SEC + item.sets * (SET_EXEC_SEC + item.intervalSec)
}

export function estimatedMinutes(items: Pick<MenuItem, 'sets' | 'intervalSec'>[]): number {
  return Math.ceil(items.reduce((sum, i) => sum + itemDurationSec(i), 0) / 60)
}

/** 1種目分の処方(重量・レップ・セット・インターバル)を組む。入れ替え・追加時にも使う */
export function prescriptionFor(exercise: Exercise, ctx: EngineContext): Prescription {
  const { weightKg, reps } = suggestWeightReps(
    exercise,
    ctx.lastPerformance.get(exercise.id!),
    ctx.bodyWeightKg,
    ctx.dumbbellStepsKg,
    ctx.patternBase1Rm ?? {},
  )
  return {
    sets: DEFAULT_SETS,
    suggestedReps: reps,
    suggestedWeightKg: weightKg,
    intervalSec: intervalSecFor(reps, exercise.movementType),
  }
}

/** 入れ替え・追加用の代替候補: 同部位かつ器具・痛みフラグの条件を満たす種目 */
export function alternativesFor(
  ctx: EngineContext,
  muscle: MuscleGroup,
  excludeExerciseIds: number[],
): Exercise[] {
  const injured = new Set(ctx.activeInjuries)
  const exclude = new Set(excludeExerciseIds)
  return ctx.exercises
    .filter((e) => e.isActive === 1 && e.primaryMuscle === muscle)
    .filter((e) => !exclude.has(e.id!))
    .filter((e) => isExerciseAvailable(e, ctx))
    .filter((e) => !e.muscleGroups.some((m) => injured.has(m)))
    .sort((a, b) => (a.movementType === b.movementType ? a.id! - b.id! : a.movementType === 'compound' ? -1 : 1))
}

/** 疲れ気味: 総セット数を係数分に削減する(各種目MIN_SETSまで。それでも超える場合は後ろの種目を削る) */
function applyVolumeFactor(items: MenuItem[], condition: Condition): MenuItem[] {
  const factor = CONDITION_VOLUME_FACTOR[condition]
  if (factor >= 1 || items.length === 0) return items
  const totalSets = items.reduce((sum, i) => sum + i.sets, 0)
  let toRemove = totalSets - Math.round(totalSets * factor)
  const result = items.map((i) => ({ ...i }))
  // 後ろの種目(優先度低)から1セットずつ削る
  for (let i = result.length - 1; i >= 0 && toRemove > 0; i--) {
    const reducible = result[i].sets - MIN_SETS
    const cut = Math.min(reducible, toRemove)
    result[i].sets -= cut
    toRemove -= cut
  }
  // まだ削る必要があれば末尾の種目ごと削除(最低1種目は残す)
  while (toRemove > 0 && result.length > 1) {
    toRemove -= result[result.length - 1].sets
    result.pop()
  }
  return result
}

/** その日の最適メニューを生成する(F-04ロジック1〜7) */
export function generateMenu(ctx: EngineContext, request: MenuRequest): GeneratedMenu {
  const freshness = muscleFreshnessMap(ctx)
  const { muscles, warnings } = selectMuscles(
    ctx,
    request.targetMuscles,
    request.availableMinutes,
    freshness,
  )

  const candidates = candidatesByMuscle(ctx, muscles, request.condition)
  const budgetSec = request.availableMinutes * 60
  const items: MenuItem[] = []
  let usedSec = 0

  // 部位を跨いだラウンドロビンで、時間予算に収まる限り種目を積む(コンパウンド優先は候補順で担保)
  const maxDepth = Math.max(0, ...[...candidates.values()].map((list) => list.length))
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const muscle of muscles) {
      const exercise = candidates.get(muscle)?.[depth]
      if (!exercise) continue
      const item: MenuItem = { exerciseId: exercise.id!, ...prescriptionFor(exercise, ctx) }
      const cost = itemDurationSec(item)
      if (usedSec + cost <= budgetSec) {
        items.push(item)
        usedSec += cost
      } else if (items.length === 0) {
        // 15分などの短時間でも最低1種目は提案する(セットを削って収める)
        while (item.sets > MIN_SETS && itemDurationSec(item) > budgetSec) {
          item.sets--
        }
        items.push(item)
        usedSec += itemDurationSec(item)
      }
    }
  }

  // コンディション補正(F-04-6)
  let adjusted = applyVolumeFactor(items, request.condition)
  if (request.condition === 'great') {
    // 絶好調: 最初のコンパウンド種目にPR挑戦セットを1つ付ける
    const exerciseById = new Map(ctx.exercises.map((e) => [e.id!, e]))
    const prIndex = adjusted.findIndex(
      (i) => exerciseById.get(i.exerciseId)?.movementType === 'compound',
    )
    if (prIndex >= 0) {
      adjusted = adjusted.map((item, idx) =>
        idx === prIndex ? { ...item, isPrAttempt: true } : item,
      )
    }
  }

  const muscleSummary = muscles
    .map((m) => `${MUSCLE_GROUP_LABELS[m]}(回復${freshness[m]}%)`)
    .join('・')
  const rationale =
    muscles.length === 0
      ? '実施可能な部位がありません。痛みフラグや器具設定を確認してください'
      : `今日の対象: ${muscleSummary}。回復状況と使える時間から構成しました`

  return {
    items: adjusted,
    muscles,
    rationale,
    warnings,
    estimatedMinutes: estimatedMinutes(adjusted),
  }
}

/** 絶好調時のPR挑戦セット用: 現在の提案重量の次のステップ(それ以上なければ同じ重量) */
export function prAttemptWeightKg(
  suggestedWeightKg: number | undefined,
  stepsKg: number[],
): number | undefined {
  if (suggestedWeightKg === undefined || stepsKg.length === 0) return suggestedWeightKg
  return snapToSteps(suggestedWeightKg, stepsKg, 'up')
}
