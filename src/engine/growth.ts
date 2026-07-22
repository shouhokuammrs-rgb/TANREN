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

/** DB層が組み立てる入力: 1セッション×1種目分の実績 */
export interface GrowthSessionInput {
  performedAt: Date
  exerciseId: number
  exerciseName: string
  /** 種目の主働部位 */
  muscle: MuscleGroup
  sets: GrowthSetInput[]
}

/** 基準種目のセッション1点(日単位。同一日の同種目はe1RM最大値に統合) */
export interface GrowthPoint {
  date: Date
  e1RmKg: number
}

export interface MuscleGrowth {
  muscle: MuscleGroup
  /** 基準種目(期間内でセッション数最多。同数なら直近が新しい方)。実績ゼロならundefined */
  anchorExerciseId?: number
  anchorExerciseName?: string
  /** 基準種目のセッション数(日単位) */
  sessionCount: number
  /** セッション3回以上で変化率・推移を表示(モックの「冷えた鉄」定義) */
  hasEnoughData: boolean
  /** 基準種目のe1RM推移(古い順) */
  points: GrowthPoint[]
  /** 実測の成長率(期間内 最古→最新)。チップ・グラフ表示用 */
  growthRate?: number
  /** 月換算(×30/期間日数)の成長率。人体図の色エンコーディング専用 */
  monthlyRate?: number
}

const ALL_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'abs', 'glutes']

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** 種目ごとに日単位のe1RM点列へ集約(同一日は最大値・古い順) */
function pointsByExercise(
  sessions: GrowthSessionInput[],
): Map<number, { name: string; points: GrowthPoint[]; latest: number }> {
  const byExercise = new Map<number, { name: string; byDay: Map<string, GrowthPoint> }>()
  for (const s of sessions) {
    const e1rm = sessionE1Rm(s.sets)
    if (e1rm === undefined) continue
    const entry = byExercise.get(s.exerciseId) ?? { name: s.exerciseName, byDay: new Map() }
    const key = dayKey(s.performedAt)
    const existing = entry.byDay.get(key)
    if (!existing || e1rm > existing.e1RmKg) {
      entry.byDay.set(key, { date: s.performedAt, e1RmKg: e1rm })
    }
    byExercise.set(s.exerciseId, entry)
  }
  const result = new Map<number, { name: string; points: GrowthPoint[]; latest: number }>()
  for (const [id, entry] of byExercise) {
    const points = [...entry.byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
    result.set(id, { name: entry.name, points, latest: points[points.length - 1].date.getTime() })
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
  let anchor: { id: number; name: string; points: GrowthPoint[]; latest: number } | undefined
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
    return { muscle, sessionCount: 0, hasEnoughData: false, points: [] }
  }

  const sessionCount = anchor.points.length
  const hasEnoughData = sessionCount >= GROWTH_MIN_SESSIONS
  if (!hasEnoughData) {
    return {
      muscle,
      anchorExerciseId: anchor.id,
      anchorExerciseName: anchor.name,
      sessionCount,
      hasEnoughData,
      points: anchor.points,
    }
  }

  const first = anchor.points[0].e1RmKg
  const last = anchor.points[anchor.points.length - 1].e1RmKg
  const growthRate = (last - first) / first
  return {
    muscle,
    anchorExerciseId: anchor.id,
    anchorExerciseName: anchor.name,
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
