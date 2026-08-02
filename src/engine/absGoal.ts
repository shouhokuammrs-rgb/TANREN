// 腹の段位型ゴール+加重昇格(DEC-017改/018改)。UI非依存の純関数のみ置く。
// 段位は係数軸(GOAL_COEF/targetE1Rm)に載せない別経路。条件クリアの判定述語と
// 段位導出だけを持ち、クリアの永続保存はDB層(goal_events)の責務

import type { AbsCondition, GoalLevel } from '../db/types'

/** isCapReached用のセット入力(ExerciseHistoryEntryのセットと同形) */
export interface CapCheckSet {
  reps?: number
  achieved?: boolean
  atFailure?: boolean
}

/**
 * 上限完遂の共通述語(spec §5)。progression.tsの自重頭打ち分岐と同じ条件:
 * 全セット達成 かつ 最小レップがrepRangeMax以上 かつ「限界でした」なし。
 * 昇格提案の発火(クランチのみ)と条件C1〜C3のクリア判定の両方で使う
 */
export function isCapReached(
  exercise: { repRangeMax: number },
  sets: CapCheckSet[],
): boolean {
  const recorded = sets.filter((s) => s.reps !== undefined)
  if (recorded.length === 0) return false
  const minReps = Math.min(...recorded.map((s) => s.reps!))
  const allAchieved = recorded.every((s) => s.achieved !== false)
  const anyAtFailure = recorded.some((s) => s.atFailure === true)
  return allAchieved && minReps >= exercise.repRangeMax && !anyAtFailure
}

/** 腹の段位ランク(比較用)。段位なしは0 */
const ABS_LEVEL_RANK: Partial<Record<GoalLevel, number>> = { toned: 1, solid: 2, big: 3 }

export function absLevelRank(level: GoalLevel | null): number {
  return level === null ? 0 : (ABS_LEVEL_RANK[level] ?? 0)
}

/**
 * クリア済み条件から到達段位を導出する(spec §2-1・順不同):
 * attained = C3 ? 'big' : (C1 && C2) ? 'solid' : (C1 || C2) ? 'toned' : null
 */
export function absAttained(cleared: Iterable<AbsCondition>): GoalLevel | null {
  const set = new Set(cleared)
  if (set.has('C3')) return 'big'
  if (set.has('C1') && set.has('C2')) return 'solid'
  if (set.has('C1') || set.has('C2')) return 'toned'
  return null
}

/** 選択中ゴール段位に到達しているか(到達段位 ≥ 選択段位) */
export function absLevelSatisfied(cleared: Iterable<AbsCondition>, level: GoalLevel): boolean {
  return absLevelRank(absAttained(cleared)) >= absLevelRank(level)
}
