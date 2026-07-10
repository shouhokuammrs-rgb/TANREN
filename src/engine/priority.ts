// ギャップ分析(F-03): 目標ボディ×ヒヤリング結果→部位別優先度スコア。UI非依存の純関数

import {
  AVOID_FACTOR,
  FOCUS_BOOST,
  GOAL_PRIORITY_MAP,
  WANT_BOOST,
  WEEKLY_SETS_MAX,
  WEEKLY_SETS_PER_PRIORITY,
} from '../constants/goals'
import { MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { Goal, MuscleGroup } from '../db/types'

export const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'abs',
  'glutes',
]

/** 部位別優先度スコアを算出する。目標未設定なら全部位1.0(従来動作) */
export function priorityScores(goal: Goal | undefined): Record<MuscleGroup, number> {
  const result = {} as Record<MuscleGroup, number>
  for (const m of ALL_MUSCLES) result[m] = 1
  if (!goal) return result

  const base = GOAL_PRIORITY_MAP[goal.goalType]
  for (const m of ALL_MUSCLES) {
    let score = base[m]
    if (goal.goalType === 'focus' && goal.focusParts?.includes(m)) {
      score *= FOCUS_BOOST
    }
    if (goal.wantParts.includes(m)) {
      score *= WANT_BOOST
    }
    const avoid = goal.avoidParts.find((a) => a.part === m)
    if (avoid) {
      score *= AVOID_FACTOR[avoid.reason]
    }
    result[m] = Math.round(score * 100) / 100
  }
  return result
}

export interface GapAnalysis {
  scores: Record<MuscleGroup, number>
  /** 優先部位トップ3(スコア降順) */
  top3: { muscle: MuscleGroup; score: number; reason: string }[]
  /** 週あたり推奨部位別セット数 */
  weeklySetTargets: Record<MuscleGroup, number>
}

function reasonFor(goal: Goal, muscle: MuscleGroup): string {
  const parts: string[] = []
  const base = GOAL_PRIORITY_MAP[goal.goalType][muscle]
  if (base > 1) parts.push('目標ボディの重点部位')
  if (goal.goalType === 'focus' && goal.focusParts?.includes(muscle)) parts.push('特化指定')
  if (goal.wantParts.includes(muscle)) parts.push('鍛えたい部位に指定')
  return parts.length > 0 ? parts.join('・') : 'バランス維持'
}

/** ギャップ分析の出力(F-03): トップ3と理由、週間推奨セット数 */
export function analyzeGap(goal: Goal): GapAnalysis {
  const scores = priorityScores(goal)
  const top3 = [...ALL_MUSCLES]
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 3)
    .map((muscle) => ({ muscle, score: scores[muscle], reason: reasonFor(goal, muscle) }))

  const weeklySetTargets = {} as Record<MuscleGroup, number>
  for (const m of ALL_MUSCLES) {
    weeklySetTargets[m] = Math.min(
      WEEKLY_SETS_MAX,
      Math.round(scores[m] * WEEKLY_SETS_PER_PRIORITY),
    )
  }
  return { scores, top3, weeklySetTargets }
}

/** UI表示用: 部位ラベル(エンジンからの再エクスポート的ヘルパー) */
export function muscleLabel(muscle: MuscleGroup): string {
  return MUSCLE_GROUP_LABELS[muscle]
}
