// 部位別ゴールモデル(DEC-013 / Phase 7-5a)。UI非依存の純関数のみ置く。
// ゴールe1RM = 体重 × 係数(自動追従)。進捗のスタートは保存しない導出値
// (現行基準種目の全期間最古の実ログe1RM)。優先度はギャップの関数(F-03置き換え)

import {
  GOAL_MAINTAIN_PRIORITY,
  GOAL_PRIORITY_BASE,
  GOAL_PRIORITY_MAX,
  GOAL_PRIORITY_MIN,
  GOAL_PRIORITY_SLOPE,
  GOAL_TARGET_MUSCLES,
  isGoalTargetMuscle,
} from '../constants/goals'
import type { MuscleGoal, MuscleGroup } from '../db/types'
import { E1RM_REP_CLAMP, muscleGrowthMap, type GrowthSessionInput } from './growth'

/**
 * 器具で計測できるe1RMの上限。maxダンベル × (1 + レップ12クランプ/30)。
 * ハードコードせず導出する(現24kg→33.6kg。将来の器具拡張に自動追従)
 */
export function equipmentE1RmCap(dumbbellStepsKg: number[]): number {
  if (dumbbellStepsKg.length === 0) return 0
  // 小数第1位に丸める(24×1.4=33.599…の浮動小数点誤差で境界判定がぶれないように)
  return Math.round(Math.max(...dumbbellStepsKg) * (1 + E1RM_REP_CLAMP / 30) * 10) / 10
}

/** ゴールe1RM(片手kg・小数第1位)。最新体重で都度計算する(保存しない) */
export function targetE1Rm(coef: number, bodyWeightKg: number): number {
  return Math.round(coef * bodyWeightKg * 10) / 10
}

/** 直接編集の係数化(DEC-013: 固定kg保存禁止)。編集kg ÷ 編集時点体重 */
export function coefForDirectEdit(targetKg: number, bodyWeightKg: number): number {
  return targetKg / bodyWeightKg
}

/** 目標が器具の計測上限を超えているか(帯表示用。選択は妨げない) */
export function isCapped(target: number, capKg: number): boolean {
  return target > capKg
}

export interface GoalProgress {
  /** 0〜1にクランプ。start≧targetは即1.0 */
  ratio: number
  /** あとNkg(下限0) */
  remainingKg: number
}

/**
 * 進捗(スタート→現在→ゴール)。start/currentが実ログから導出できない部位は
 * undefined(進捗未表示・ゴールのみ表示)
 */
export function goalProgress(
  start: number | undefined,
  current: number | undefined,
  target: number,
): GoalProgress | undefined {
  if (start === undefined || current === undefined) return undefined
  const remainingKg = Math.max(0, Math.round((target - current) * 10) / 10)
  if (start >= target) return { ratio: 1, remainingKg }
  const ratio = Math.min(1, Math.max(0, (current - start) / (target - start)))
  return { ratio, remainingKg }
}

/** ゴールとの相対ギャップ(0〜1)。現在値が未導出の部位はギャップ最大(=1)として扱う */
export function goalGapRatio(target: number, current: number | undefined): number {
  if (target <= 0) return 0
  return Math.max(0, (target - (current ?? 0)) / target)
}

/** 動的優先度: clamp(BASE + SLOPE × gapRatio, MIN, MAX) */
export function goalPriority(gapRatio: number): number {
  return Math.min(
    GOAL_PRIORITY_MAX,
    Math.max(GOAL_PRIORITY_MIN, GOAL_PRIORITY_BASE + GOAL_PRIORITY_SLOPE * gapRatio),
  )
}

/**
 * 部位別優先度スコア(F-03置き換え・DEC-013)。
 * - growthゴール: 優先度 = f(ギャップ)
 * - maintainゴール: 固定0.4
 * - ゴール未設定・対象外部位(尻・腹): 中立1.0
 * 選択式(フレッシュネス×優先度)・injuryハード除外の構造は不変
 */
export function goalPriorityScores(
  goals: Pick<MuscleGoal, 'muscle' | 'coef' | 'mode'>[],
  bodyWeightKg: number,
  currentE1Rm: Partial<Record<MuscleGroup, number>>,
): Record<MuscleGroup, number> {
  const result = {
    chest: 1,
    back: 1,
    shoulders: 1,
    arms: 1,
    legs: 1,
    abs: 1,
    glutes: 1,
  } as Record<MuscleGroup, number>
  for (const goal of goals) {
    if (!isGoalTargetMuscle(goal.muscle)) continue
    if (goal.mode === 'maintain') {
      result[goal.muscle] = GOAL_MAINTAIN_PRIORITY
      continue
    }
    const target = targetE1Rm(goal.coef, bodyWeightKg)
    result[goal.muscle] =
      Math.round(goalPriority(goalGapRatio(target, currentE1Rm[goal.muscle])) * 100) / 100
  }
  return result
}

export interface GoalTrend {
  /** スタート(導出値): 現行基準種目の全期間最古の実ログe1RM */
  startE1Rm?: number
  /** 現在: 同じ基準種目の最新実ログe1RM */
  currentE1Rm?: number
}

/** 全期間扱いの期間日数(進捗のスタート導出用) */
const ALL_TIME_DAYS = 36500

/**
 * ゴール進捗用のスタート/現在e1RMを導出する(保存しない・DEC-013)。
 * growth.tsの基準種目選定を全期間で再利用。ゴール指標はe1RMのため自重種目
 * (レップ指標・ISS-018)のセッションは対象外(該当部位はundefined=進捗未表示)
 */
export function goalTrendByMuscle(
  sessions: GrowthSessionInput[],
  now: Date,
): Partial<Record<MuscleGroup, GoalTrend>> {
  const e1rmSessions = sessions.filter((s) => !s.bodyweight)
  const growthMap = muscleGrowthMap(e1rmSessions, ALL_TIME_DAYS, now)
  const result: Partial<Record<MuscleGroup, GoalTrend>> = {}
  for (const muscle of GOAL_TARGET_MUSCLES) {
    const growth = growthMap[muscle]
    if (growth.points.length === 0) continue
    result[muscle] = {
      startE1Rm: growth.points[0].value,
      currentE1Rm: growth.points[growth.points.length - 1].value,
    }
  }
  return result
}
