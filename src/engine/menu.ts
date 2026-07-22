// メニュー生成エンジンv1(要件F-04)。
// 回復モデル→部位決定→種目選択→重量・レップ提案→インターバル→コンディション補正の順に組む。
// UI非依存の純関数。DBスナップショット(EngineContext)を受け取る。

import {
  CONDITION_VOLUME_FACTOR,
  DEFAULT_SETS,
  EXERCISE_SETUP_SEC,
  MIN_SETS,
  SET_EXEC_SEC,
  SHORTENED_NOTICE_RATIO,
} from '../constants/engine'
import { MENU_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { Condition, Exercise, MuscleGroup } from '../db/types'
import { effectiveRecoveryHours, hoursUntilRecovered, muscleFreshnessMap } from './freshness'
import { intervalSecFor } from './interval'
import { snapToSteps, suggestWeightReps } from './progression'
import {
  candidatesByMuscle,
  compareCandidates,
  isExerciseAvailable,
  selectMuscles,
  type ExcludedRecoveringMuscle,
} from './selection'
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
    ctx.performanceHistory?.get(exercise.id!) ?? [],
    ctx.tuning,
  )
  return {
    // 基本セット数は上級者設定(DEC-010)で上書き可能
    sets: ctx.tuning?.defaultSets ?? DEFAULT_SETS,
    suggestedReps: reps,
    suggestedWeightKg: weightKg,
    intervalSec: intervalSecFor(reps, exercise.movementType),
  }
}

/**
 * 入れ替え・追加用の代替候補: 同部位かつ器具・痛みフラグの条件を満たす種目。
 * 並びは生成と同じ共通コンパレータ(DEC-012: コンパウンド→強調ローテーション→実績→ID)
 */
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
    .sort(compareCandidates(ctx, muscle))
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

/** 短縮理由の部位名列挙(DEC-006)。最大3件、4件以上は「A、B、Cほか」 */
export function recoveringListLabel(excluded: ExcludedRecoveringMuscle[]): string {
  const names = excluded.map((e) => MUSCLE_GROUP_LABELS[e.muscle])
  return names.length <= 3 ? names.join('と') : `${names.slice(0, 3).join('、')}ほか`
}

/** 短縮通知を出すべきか(DEC-006)。回復中部位の除外が原因で希望時間×係数を下回ったとき */
export function isShortenedMenu(
  estimatedMinutes: number,
  requestedMinutes: number,
  hasExcludedRecovering: boolean,
): boolean {
  return hasExcludedRecovering && estimatedMinutes < requestedMinutes * SHORTENED_NOTICE_RATIO
}

/** その日の最適メニューを生成する(F-04ロジック1〜7) */
export function generateMenu(ctx: EngineContext, request: MenuRequest): GeneratedMenu {
  const freshness = muscleFreshnessMap(ctx)
  const { muscles, warnings, excludedRecovering, isRestDay } = selectMuscles(
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
      const item: MenuItem = {
        exerciseId: exercise.id!,
        emphasis: exercise.emphasis,
        ...prescriptionFor(exercise, ctx),
      }
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

  const estimated = estimatedMinutes(adjusted)
  const isShortened = !isRestDay && isShortenedMenu(estimated, request.availableMinutes, excludedRecovering.length > 0)

  // 説明文(DEC-006: 休養日・短縮時は指定文言を優先)。
  // 対象行はrationaleと分離して返し、短縮通知時も併記できるようにする(DEC-010 §3-2)
  const muscleParts = muscles
    .map((m) => `${MUSCLE_GROUP_LABELS[m]}(回復${freshness[m]}%)`)
    .join('・')
  const muscleSummary = muscles.length > 0 ? `今日の対象: ${muscleParts}` : ''
  const rationale = isRestDay
    ? `${MENU_COPY.restDayTitle}。${MENU_COPY.restDayReason}`
    : muscles.length === 0
      ? '実施可能な部位がありません。痛みフラグや器具設定を確認してください'
      : isShortened
        ? MENU_COPY.shortenedNotice(estimated, recoveringListLabel(excludedRecovering))
        : `${muscleSummary}。回復状況と使える時間から構成しました`

  // 回復予測(DEC-010 §3-1): 除外部位のうち最短で100%に到達するもの。tuningの回復時間を反映
  const stimulusByMuscle = new Map(ctx.muscleStimuli.map((s) => [s.muscle, s]))
  let soonestRecovery: GeneratedMenu['soonestRecovery']
  for (const e of excludedRecovering) {
    const hours = hoursUntilRecovered(
      e.freshness,
      effectiveRecoveryHours(e.muscle, stimulusByMuscle.get(e.muscle)?.setCount ?? 0, ctx.tuning),
    )
    if (!soonestRecovery || hours < soonestRecovery.hoursUntilRecovered) {
      soonestRecovery = { muscle: e.muscle, hoursUntilRecovered: hours }
    }
  }

  return {
    items: adjusted,
    muscles,
    rationale,
    warnings,
    estimatedMinutes: estimated,
    requestedMinutes: request.availableMinutes,
    isShortened,
    excludedRecoveringMuscles: excludedRecovering,
    isRestDay,
    muscleSummary,
    soonestRecovery,
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
