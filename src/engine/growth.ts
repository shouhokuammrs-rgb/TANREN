// 成長算出(DEC-009/DEC-011)。UI非依存の純関数のみ置く。
// e1RM計算・基準種目選定・成長率算出はこのモジュールに隔離し、UIはここだけを参照する

import { GROWTH_MIN_SESSIONS } from '../constants/charts'
import type { MuscleGroup } from '../db/types'

/** e1RM算出のレップ上限クランプ(DEC-011確定)。高レップのEpley過大評価を抑える */
export const E1RM_REP_CLAMP = 12

/**
 * Epley式のe1RM(レップ12クランプ・DEC-011確定): weight × (1 + min(reps, 12) / 30)。
 * ※キャリブレーション(ISS-002)のepley1Rmとは意味が異なるため別関数(こちらは成長トレンド用)
 */
export function growthE1Rm(weightKg: number, reps: number): number {
  return weightKg * (1 + Math.min(reps, E1RM_REP_CLAMP) / 30)
}

export interface GrowthSetInput {
  weightKg?: number
  reps?: number
}

/** 成長指標の種別(ISS-018): ダンベル種目=e1RM / 自重種目=最大レップ */
export type GrowthMetric = 'e1rm' | 'reps'

/** セッションe1RM(種目単位): 全記録セットのEpley値の最大。重量記録がなければundefined(自重種目等) */
export function sessionE1Rm(sets: GrowthSetInput[]): number | undefined {
  let max: number | undefined
  for (const s of sets) {
    if (s.weightKg === undefined || s.weightKg <= 0 || s.reps === undefined || s.reps <= 0) continue
    const e1rm = growthE1Rm(s.weightKg, s.reps)
    if (max === undefined || e1rm > max) max = e1rm
  }
  return max
}

/**
 * セッション最大レップ(自重種目の成長指標・ISS-018)。記録セット中の最大reps。
 * E1RM_REP_CLAMPは適用しない(クランチ等の15〜25レンジでクランプすると成長が消える)
 */
export function sessionMaxReps(sets: GrowthSetInput[]): number | undefined {
  let max: number | undefined
  for (const s of sets) {
    if (s.reps === undefined || s.reps <= 0) continue
    if (max === undefined || s.reps > max) max = s.reps
  }
  return max
}

/** DB層が組み立てる入力: 1セッション×1種目分の実績 */
export interface GrowthSessionInput {
  performedAt: Date
  exerciseId: number
  exerciseName: string
  /** 種目の主働部位 */
  muscle: MuscleGroup
  /** 自重種目(requiredEquipmentに'bodyweight'を含む)ならtrue → レップ指標(ISS-018)。マスタ基準で固定 */
  bodyweight?: boolean
  sets: GrowthSetInput[]
}

/** 基準種目のセッション1点(日単位。同一日の同種目は最大値に統合)。valueの単位はmetricに依存 */
export interface GrowthPoint {
  date: Date
  /** e1RM(kg)または最大レップ(回)(ISS-018) */
  value: number
}

export interface MuscleGrowth {
  muscle: MuscleGroup
  /** 基準種目(期間内でセッション数最多。同数なら直近が新しい方)。実績ゼロならundefined */
  anchorExerciseId?: number
  anchorExerciseName?: string
  /** 基準種目の成長指標(ISS-018)。自重種目='reps'、それ以外='e1rm' */
  metric: GrowthMetric
  /** 基準種目のセッション数(日単位) */
  sessionCount: number
  /** セッション3回以上で変化率・推移を表示(モックの「冷えた鉄」定義) */
  hasEnoughData: boolean
  /** 基準種目の推移(古い順)。値の単位はmetric参照 */
  points: GrowthPoint[]
  /** 実測の成長率(期間内 最古→最新)。チップ・グラフ表示用。式は指標共通の(last-first)/first */
  growthRate?: number
  /** 月換算(×30/期間日数)の成長率。人体図の色エンコーディング専用(閾値もe1RMと共通・v1) */
  monthlyRate?: number
}

const ALL_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs', 'glutes']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** 種目ごとに日単位の指標点列へ集約(同一日は最大値・古い順)。自重種目はレップ・他はe1RM(ISS-018) */
function pointsByExercise(
  sessions: GrowthSessionInput[],
): Map<number, { name: string; metric: GrowthMetric; points: GrowthPoint[]; latest: number }> {
  const byExercise = new Map<
    number,
    { name: string; metric: GrowthMetric; byDay: Map<string, GrowthPoint> }
  >()
  for (const s of sessions) {
    const metric: GrowthMetric = s.bodyweight ? 'reps' : 'e1rm'
    const value = metric === 'reps' ? sessionMaxReps(s.sets) : sessionE1Rm(s.sets)
    if (value === undefined) continue
    const entry =
      byExercise.get(s.exerciseId) ?? { name: s.exerciseName, metric, byDay: new Map() }
    const key = dayKey(s.performedAt)
    const existing = entry.byDay.get(key)
    if (!existing || value > existing.value) {
      entry.byDay.set(key, { date: s.performedAt, value })
    }
    byExercise.set(s.exerciseId, entry)
  }
  const result = new Map<
    number,
    { name: string; metric: GrowthMetric; points: GrowthPoint[]; latest: number }
  >()
  for (const [id, entry] of byExercise) {
    const points = [...entry.byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
    result.set(id, {
      name: entry.name,
      metric: entry.metric,
      points,
      latest: points[points.length - 1].date.getTime(),
    })
  }
  return result
}

/** 1部位の成長を算出する(期間フィルタ済みのセッション入力を渡す) */
function growthForMuscle(
  muscle: MuscleGroup,
  sessions: GrowthSessionInput[],
  periodDays: number,
): MuscleGrowth {
  const exercises = pointsByExercise(sessions)

  // 基準種目: セッション数(日単位)最多。同数は直近セッションが新しい方(DEC-011 §1-3)
  // 基準種目の選定は指標をまたいで回数ベースで比較(ISS-018: e1RM/レップ混在部位でも変更なし)
  let anchor:
    | { id: number; name: string; metric: GrowthMetric; points: GrowthPoint[]; latest: number }
    | undefined
  for (const [id, entry] of exercises) {
    if (
      !anchor ||
      entry.points.length > anchor.points.length ||
      (entry.points.length === anchor.points.length && entry.latest > anchor.latest)
    ) {
      anchor = { id, ...entry }
    }
  }

  if (!anchor) {
    return { muscle, metric: 'e1rm', sessionCount: 0, hasEnoughData: false, points: [] }
  }

  const sessionCount = anchor.points.length
  const hasEnoughData = sessionCount >= GROWTH_MIN_SESSIONS
  if (!hasEnoughData) {
    return {
      muscle,
      anchorExerciseId: anchor.id,
      anchorExerciseName: anchor.name,
      metric: anchor.metric,
      sessionCount,
      hasEnoughData,
      points: anchor.points,
    }
  }

  const first = anchor.points[0].value
  const last = anchor.points[anchor.points.length - 1].value
  const growthRate = (last - first) / first
  return {
    muscle,
    anchorExerciseId: anchor.id,
    anchorExerciseName: anchor.name,
    metric: anchor.metric,
    sessionCount,
    hasEnoughData,
    points: anchor.points,
    growthRate,
    // 色エンコーディング専用の月換算(期間を切り替えても色の意味が変わらない)
    monthlyRate: growthRate * (30 / periodDays),
  }
}

/**
 * 全部位の成長マップ(DEC-011)。
 * 部位の成長は基準種目の中でのみ比較する(種目をまたいだe1RM比較は行わない)
 */
export function muscleGrowthMap(
  sessions: GrowthSessionInput[],
  periodDays: number,
  now: Date,
): Record<MuscleGroup, MuscleGrowth> {
  const since = now.getTime() - periodDays * 24 * 3_600_000
  const inPeriod = sessions.filter((s) => s.performedAt.getTime() >= since)
  const byMuscle = new Map<MuscleGroup, GrowthSessionInput[]>()
  for (const s of inPeriod) {
    byMuscle.set(s.muscle, [...(byMuscle.get(s.muscle) ?? []), s])
  }
  return Object.fromEntries(
    ALL_MUSCLES.map((m) => [m, growthForMuscle(m, byMuscle.get(m) ?? [], periodDays)]),
  ) as Record<MuscleGroup, MuscleGrowth>
}

// ===== ホームの成長1行サマリー(DEC-015 §3-4) =====

export interface WeeklyGain {
  muscle: MuscleGroup
  /** 直近7日のe1RM上昇幅(kg・小数第1位) */
  gainKg: number
}

/**
 * 直近7日でe1RM上昇幅が最大の部位を選ぶ(純関数)。
 * - e1RM指標のみ(自重レップ指標は対象外・kg比較できないため)
 * - 基準種目の全期間系列で「7日前以前の最新値 → 現在値」の差分を上昇幅とする
 * - 直近7日に記録がない部位・上昇が0以下の部位は対象外。該当なしはnull(ブロック非表示)
 */
export function weeklyTopGain(sessions: GrowthSessionInput[], now: Date): WeeklyGain | null {
  const e1rmSessions = sessions.filter((s) => !s.bodyweight)
  const map = muscleGrowthMap(e1rmSessions, 36500, now)
  const weekAgo = now.getTime() - 7 * 24 * 3_600_000
  let best: WeeklyGain | null = null
  for (const muscle of ALL_MUSCLES) {
    const points = map[muscle].points
    if (points.length === 0) continue
    const current = points[points.length - 1]
    if (current.date.getTime() < weekAgo) continue
    const baseline = [...points].reverse().find((p) => p.date.getTime() <= weekAgo)
    if (!baseline) continue // 7日より前の実績がない=比較基準なし
    const gainKg = Math.round((current.value - baseline.value) * 10) / 10
    if (gainKg > 0 && (best === null || gainKg > best.gainKg)) best = { muscle, gainKg }
  }
  return best
}
