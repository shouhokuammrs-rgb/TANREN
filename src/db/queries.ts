// DBアクセス層。エンジンへのスナップショット作成とセッションの読み書きを集約する

import { db } from './db'
import type {
  BodyStat,
  Condition,
  Exercise,
  ExerciseEmphasis,
  Goal,
  MealTiming,
  MuscleGroup,
  Photo,
  PhotoPose,
  Session,
  SessionExercise,
  SetRecord,
} from './types'
import { EMPHASIS_HISTORY_SESSIONS } from '../constants/engine'
import type {
  EngineContext,
  ExerciseHistoryEntry,
  GeneratedMenu,
  MenuRequest,
  MuscleStimulus,
} from '../engine/types'
import {
  detectPrSetNumbers,
  patternBase1RmFrom,
  prAttemptWeightKg,
  priorityScores,
  summarizeExercise,
  type CompletedSetInput,
  type ExerciseSummary,
  type PastSetInput,
} from '../engine'
import type { GrowthSessionInput } from '../engine/growth'
import { loadEngineTuning } from '../utils/engineTuning'

/** エンジン入力のスナップショットを組み立てる */
export async function loadEngineContext(now = new Date()): Promise<EngineContext> {
  const [profile, equipment, exercises, injuries, strengthMarks, latestGoal] = await Promise.all([
    db.profiles.orderBy('id').first(),
    db.equipment.where('isActive').equals(1).toArray(),
    db.exercises.toArray(),
    db.injuries.where('isActive').equals(1).toArray(),
    db.strength_marks.toArray(),
    loadGoal(),
  ])

  const dumbbell = equipment.find((e) => e.type === 'dumbbell')
  const bench = equipment.find((e) => e.type === 'bench')

  // 直近の完了・中断セッション(部分実施も刺激としてカウント)を新しい順に走査
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
    (s) => s.status === 'completed' || s.status === 'aborted',
  )

  // 種目ごとに直近3セッション分の実績を集める(直近=進行判定、以前=2ステップ増量の連続判定: ISS-013b)
  const HISTORY_DEPTH = 3
  const entriesByExercise = new Map<number, ExerciseHistoryEntry[]>()
  const stimulusByMuscle = new Map<MuscleGroup, MuscleStimulus>()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))
  // 強調ローテーション(DEC-012): 部位ごとの直近セッションで使った強調区分(新しい順)
  const recentEmphasis = new Map<MuscleGroup, ExerciseEmphasis[]>()
  const emphasisSessionCount = new Map<MuscleGroup, number>()

  for (const session of sessions) {
    const sessionExercises = await db.session_exercises
      .where('sessionId')
      .equals(session.id!)
      .toArray()
    const muscleSetCount = new Map<MuscleGroup, number>()
    const sessionEmphasis = new Map<MuscleGroup, ExerciseEmphasis[]>()

    for (const se of sessionExercises) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      const completed = sets.filter((s) => s.completedAt !== undefined)
      if (completed.length === 0) continue

      const entries = entriesByExercise.get(se.exerciseId) ?? []
      if (entries.length < HISTORY_DEPTH) {
        entries.push({
          exerciseId: se.exerciseId,
          performedAt: session.startedAt,
          sets: completed.map((s) => ({
            weightKg: s.actualWeightKg ?? s.suggestedWeightKg,
            reps: s.actualReps,
            achieved: s.achieved,
            atFailure: s.atFailure,
            hadSlack: s.hadSlack,
          })),
        })
        entriesByExercise.set(se.exerciseId, entries)
      }

      const exercise = exerciseById.get(se.exerciseId)
      const muscle = exercise?.primaryMuscle
      if (muscle) {
        muscleSetCount.set(muscle, (muscleSetCount.get(muscle) ?? 0) + completed.length)
        if (exercise.emphasis !== undefined) {
          sessionEmphasis.set(muscle, [...(sessionEmphasis.get(muscle) ?? []), exercise.emphasis])
        }
      }
    }

    for (const [muscle, setCount] of muscleSetCount) {
      if (!stimulusByMuscle.has(muscle)) {
        stimulusByMuscle.set(muscle, { muscle, at: session.startedAt, setCount })
      }
      // その部位を扱った直近EMPHASIS_HISTORY_SESSIONS回分だけLRU評価の対象にする
      const count = emphasisSessionCount.get(muscle) ?? 0
      if (count < EMPHASIS_HISTORY_SESSIONS) {
        emphasisSessionCount.set(muscle, count + 1)
        const emphases = sessionEmphasis.get(muscle)
        if (emphases && emphases.length > 0) {
          recentEmphasis.set(muscle, [...(recentEmphasis.get(muscle) ?? []), ...emphases])
        }
      }
    }
  }

  const lastPerformance = new Map<number, ExerciseHistoryEntry>()
  const performanceHistory = new Map<number, ExerciseHistoryEntry[]>()
  for (const [exerciseId, entries] of entriesByExercise) {
    lastPerformance.set(exerciseId, entries[0])
    performanceHistory.set(exerciseId, entries.slice(1))
  }

  return {
    now,
    bodyWeightKg: profile?.weightKg ?? 58,
    dumbbellStepsKg: dumbbell?.weightStepsKg ?? [],
    bench:
      bench && bench.minAngleDeg !== undefined && bench.maxAngleDeg !== undefined
        ? { minAngleDeg: bench.minAngleDeg, maxAngleDeg: bench.maxAngleDeg }
        : undefined,
    exercises: exercises.filter((e) => e.isActive === 1),
    lastPerformance,
    performanceHistory,
    muscleStimuli: [...stimulusByMuscle.values()],
    activeInjuries: [...new Set(injuries.map((i) => i.bodyPart))],
    patternBase1Rm: patternBase1RmFrom(strengthMarks),
    priorityScores: priorityScores(latestGoal),
    // 上級者設定(DEC-010)。エンジンは純関数のままにするため、読み込みはここで行う
    tuning: loadEngineTuning(),
    recentEmphasis,
  }
}

/** プロフィール更新(セットアップウィザード) */
export async function updateProfile(patch: {
  heightCm?: number
  weightKg?: number
  bodyFatPct?: number
}): Promise<void> {
  const profile = await db.profiles.orderBy('id').first()
  if (profile) {
    await db.profiles.update(profile.id!, { ...patch, updatedAt: new Date() })
  }
}

/** 最新の目標設定(F-01/F-03)。未設定ならundefined */
export async function loadGoal() {
  const goals = await db.goals.toArray()
  return goals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
}

/** 目標の保存(セットアップウィザード/設定からの変更)。履歴として追加する */
export async function saveGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<void> {
  await db.goals.add({ ...goal, createdAt: new Date() })
}

/** 筋力の目安の登録(ISS-002) */
export async function addStrengthMark(input: {
  refLiftId: string
  weightKg: number
  reps: number
}): Promise<void> {
  await db.strength_marks.add({ ...input, recordedAt: new Date() })
}

export async function deleteStrengthMark(id: number): Promise<void> {
  await db.strength_marks.delete(id)
}

/** 直近の完了セッションの「次回への申し送り」(ヒヤリング画面に表示する) */
export async function loadLastHandoverNote(): Promise<string | undefined> {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray()
  return sessions.find((s) => s.status === 'completed' && s.handoverNote)?.handoverNote
}

/** 前回の就寝・起床時刻(ISS-007: 時刻ピッカーのデフォルト値に使う) */
export async function loadLastSleepTimes(): Promise<{ sleepStart?: string; sleepEnd?: string }> {
  const sessions = await db.sessions.orderBy('startedAt').reverse().toArray()
  const last = sessions.find((s) => s.sleepStart && s.sleepEnd)
  return { sleepStart: last?.sleepStart, sleepEnd: last?.sleepEnd }
}

/** セッションを関連レコードごと完全削除する(ISS-008)。エンジンは残存ログから再計算される */
export async function deleteSession(sessionId: number): Promise<void> {
  await db.transaction('rw', [db.sessions, db.session_exercises, db.sets], async () => {
    const sessionExercises = await db.session_exercises
      .where('sessionId')
      .equals(sessionId)
      .toArray()
    for (const se of sessionExercises) {
      await db.sets.where('sessionExerciseId').equals(se.id!).delete()
    }
    await db.session_exercises.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

/** コンディション詳細(ISS-007・任意) */
export interface ConditionDetail {
  sleepStart?: string
  sleepEnd?: string
  sleepHours?: number
  mealTiming?: MealTiming
}

/** 生成メニューからin_progressセッションを作成し、sessionIdを返す */
export async function startSession(
  menu: GeneratedMenu,
  request: MenuRequest,
  dumbbellStepsKg: number[],
  conditionDetail: ConditionDetail = {},
): Promise<number> {
  return db.transaction('rw', [db.sessions, db.session_exercises, db.sets], async () => {
    const sessionId = (await db.sessions.add({
      startedAt: new Date(),
      status: 'in_progress',
      muscles: menu.muscles,
      availableMinutes: request.availableMinutes,
      condition: request.condition,
      sleepStart: conditionDetail.sleepStart,
      sleepEnd: conditionDetail.sleepEnd,
      sleepHours: conditionDetail.sleepHours,
      mealTiming: conditionDetail.mealTiming,
    })) as number

    for (const [order, item] of menu.items.entries()) {
      const sessionExerciseId = (await db.session_exercises.add({
        sessionId,
        exerciseId: item.exerciseId,
        order,
      })) as number

      for (let setNumber = 1; setNumber <= item.sets; setNumber++) {
        // PR挑戦は最終セットで次の重量ステップに挑む(F-04-6 絶好調)
        const isPr = item.isPrAttempt === true && setNumber === item.sets
        await db.sets.add({
          sessionExerciseId,
          setNumber,
          suggestedWeightKg: isPr
            ? prAttemptWeightKg(item.suggestedWeightKg, dumbbellStepsKg)
            : item.suggestedWeightKg,
          suggestedReps: isPr ? undefined : item.suggestedReps,
          intervalSec: item.intervalSec,
          isPrAttempt: isPr || undefined,
        })
      }
    }
    return sessionId
  })
}

export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('in_progress').first()
}

/** 実行画面用のワークアウト一式 */
export interface WorkoutEntry {
  sessionExercise: SessionExercise
  exercise: Exercise
  sets: SetRecord[]
}

export interface Workout {
  session: Session
  entries: WorkoutEntry[]
}

export async function loadWorkout(sessionId: number): Promise<Workout | undefined> {
  const session = await db.sessions.get(sessionId)
  if (!session) return undefined
  const sessionExercises = await db.session_exercises
    .where('sessionId')
    .equals(sessionId)
    .sortBy('order')
  const entries: WorkoutEntry[] = []
  for (const se of sessionExercises) {
    const exercise = await db.exercises.get(se.exerciseId)
    if (!exercise) continue
    const sets = await db.sets.where('sessionExerciseId').equals(se.id!).sortBy('setNumber')
    entries.push({ sessionExercise: se, exercise, sets })
  }
  return { session, entries }
}

export async function recordSet(
  setId: number,
  actual: { actualWeightKg?: number; actualReps: number; atFailure?: boolean; hadSlack?: boolean },
): Promise<void> {
  const set = await db.sets.get(setId)
  if (!set) return
  const achieved =
    (set.suggestedReps === undefined || actual.actualReps >= set.suggestedReps) &&
    (set.suggestedWeightKg === undefined ||
      actual.actualWeightKg === undefined ||
      actual.actualWeightKg >= set.suggestedWeightKg)
  await db.sets.update(setId, {
    actualWeightKg: actual.actualWeightKg,
    actualReps: actual.actualReps,
    achieved,
    atFailure: actual.atFailure || undefined,
    hadSlack: actual.hadSlack || undefined,
    completedAt: new Date(),
  })
}

export async function undoSet(setId: number): Promise<void> {
  await db.sets.update(setId, {
    actualWeightKg: undefined,
    actualReps: undefined,
    achieved: undefined,
    atFailure: undefined,
    hadSlack: undefined,
    completedAt: undefined,
  })
}

export interface FinishInput {
  rpe?: number
  conditionNote?: string
  handoverNote?: string
  sessionNote?: string
  painParts: { part: MuscleGroup; note?: string }[]
}

/** セッション完了(F-06)。痛みフラグはinjuriesに登録され、次回生成で自動回避される */
export async function finishSession(sessionId: number, input: FinishInput): Promise<void> {
  await db.transaction('rw', [db.sessions, db.injuries], async () => {
    await db.sessions.update(sessionId, {
      endedAt: new Date(),
      status: 'completed',
      rpe: input.rpe,
      conditionNote: input.conditionNote || undefined,
      handoverNote: input.handoverNote || undefined,
      sessionNote: input.sessionNote || undefined,
    })
    for (const pain of input.painParts) {
      await db.injuries.add({
        bodyPart: pain.part,
        note: pain.note,
        reportedAt: new Date(),
        isActive: 1,
      })
    }
  })
  // PR判定(F-07)を保存(ログ詳細のバッジ表示用)
  await markPrSets(sessionId)
}

/** このセッションより前の完了セットを種目ごとに集める(PR判定・前回比の共通材料) */
async function pastSetsFor(
  exerciseId: number,
  beforeSession: Session,
): Promise<{ all: PastSetInput[]; prevSession: PastSetInput[] }> {
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
    (s) =>
      (s.status === 'completed' || s.status === 'aborted') &&
      s.id !== beforeSession.id &&
      s.startedAt.getTime() < beforeSession.startedAt.getTime(),
  )
  const all: PastSetInput[] = []
  let prevSession: PastSetInput[] = []
  for (const session of sessions) {
    const ses = await db.session_exercises
      .where('sessionId')
      .equals(session.id!)
      .and((se) => se.exerciseId === exerciseId)
      .toArray()
    const sessionSets: PastSetInput[] = []
    for (const se of ses) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      for (const s of sets) {
        if (s.completedAt !== undefined && s.actualReps !== undefined) {
          sessionSets.push({ weightKg: s.actualWeightKg, reps: s.actualReps })
        }
      }
    }
    if (sessionSets.length > 0 && prevSession.length === 0) {
      prevSession = sessionSets
    }
    all.push(...sessionSets)
  }
  return { all, prevSession }
}

/** セッションの各セットにPR(自己新)フラグを保存する */
async function markPrSets(sessionId: number): Promise<void> {
  const workout = await loadWorkout(sessionId)
  if (!workout) return
  for (const entry of workout.entries) {
    const today: CompletedSetInput[] = entry.sets
      .filter((s) => s.completedAt !== undefined && s.actualReps !== undefined)
      .map((s) => ({ setNumber: s.setNumber, weightKg: s.actualWeightKg, reps: s.actualReps! }))
    if (today.length === 0) continue
    const { all } = await pastSetsFor(entry.exercise.id!, workout.session)
    const prNumbers = new Set(detectPrSetNumbers(today, all))
    for (const set of entry.sets) {
      if (prNumbers.has(set.setNumber)) {
        await db.sets.update(set.id!, { isPr: true })
      }
    }
  }
}

/** セッション後サマリー(F-07)の表示データ */
export interface SessionSummaryView {
  session: Session
  exercises: (ExerciseSummary & { exercise: Exercise })[]
  /** 今週(直近7日)の部位別完了セット数 */
  weeklyMuscleSets: Partial<Record<MuscleGroup, number>>
  prCount: number
}

export async function loadSessionSummaryView(
  sessionId: number,
): Promise<SessionSummaryView | undefined> {
  const workout = await loadWorkout(sessionId)
  if (!workout) return undefined
  const exercises: SessionSummaryView['exercises'] = []
  for (const entry of workout.entries) {
    const today: CompletedSetInput[] = entry.sets
      .filter((s) => s.completedAt !== undefined && s.actualReps !== undefined)
      .map((s) => ({ setNumber: s.setNumber, weightKg: s.actualWeightKg, reps: s.actualReps! }))
    if (today.length === 0) continue
    const { all, prevSession } = await pastSetsFor(entry.exercise.id!, workout.session)
    exercises.push({
      ...summarizeExercise({
        exerciseId: entry.exercise.id!,
        todaySets: today,
        pastSets: all,
        prevSessionSets: prevSession,
      }),
      exercise: entry.exercise,
    })
  }
  return {
    session: workout.session,
    exercises,
    weeklyMuscleSets: await weeklyMuscleSets(),
    prCount: exercises.reduce((sum, e) => sum + e.prSetNumbers.length, 0),
  }
}

/** 直近7日の部位別完了セット数(サマリー・ダッシュボード共用) */
export async function weeklyMuscleSets(now = new Date()): Promise<Partial<Record<MuscleGroup, number>>> {
  const since = now.getTime() - 7 * 24 * 3_600_000
  const exercises = await db.exercises.toArray()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
    (s) => s.startedAt.getTime() >= since && s.status !== 'planned',
  )
  const result: Partial<Record<MuscleGroup, number>> = {}
  for (const session of sessions) {
    const ses = await db.session_exercises.where('sessionId').equals(session.id!).toArray()
    for (const se of ses) {
      const muscle = exerciseById.get(se.exerciseId)?.primaryMuscle
      if (!muscle) continue
      const completed = (await db.sets.where('sessionExerciseId').equals(se.id!).toArray()).filter(
        (s) => s.completedAt !== undefined,
      ).length
      if (completed > 0) result[muscle] = (result[muscle] ?? 0) + completed
    }
  }
  return result
}

/** ダッシュボード: 過去N週の部位別完了セット数推移(週開始は月曜) */
export interface WeeklyVolumePoint {
  weekLabel: string
  sets: Partial<Record<MuscleGroup, number>>
}

export async function weeklyVolumeHistory(weeks = 8, now = new Date()): Promise<WeeklyVolumePoint[]> {
  const exercises = await db.exercises.toArray()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))
  const dayMs = 24 * 3_600_000
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setTime(monday.getTime() - ((monday.getDay() + 6) % 7) * dayMs)

  const points: WeeklyVolumePoint[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday.getTime() - i * 7 * dayMs)
    // 週集計であることを明示(ISS-012)
    points.push({ weekLabel: `${start.getMonth() + 1}/${start.getDate()}週`, sets: {} })
  }
  const rangeStart = monday.getTime() - (weeks - 1) * 7 * dayMs

  const sessions = (await db.sessions.orderBy('startedAt').toArray()).filter(
    (s) => s.startedAt.getTime() >= rangeStart && s.status !== 'planned',
  )
  for (const session of sessions) {
    const index = Math.floor((session.startedAt.getTime() - rangeStart) / (7 * dayMs))
    const point = points[Math.min(Math.max(index, 0), points.length - 1)]
    const ses = await db.session_exercises.where('sessionId').equals(session.id!).toArray()
    for (const se of ses) {
      const muscle = exerciseById.get(se.exerciseId)?.primaryMuscle
      if (!muscle) continue
      const completed = (await db.sets.where('sessionExerciseId').equals(se.id!).toArray()).filter(
        (s) => s.completedAt !== undefined,
      ).length
      if (completed > 0) point.sets[muscle] = (point.sets[muscle] ?? 0) + completed
    }
  }
  return points
}

/** ホーム統計カード(デザイン仕様§5): 連続記録(日)と今週ボリューム(kg) */
export interface HomeStats {
  streakDays: number
  weeklyVolumeKg: number
}

export async function homeStats(now = new Date()): Promise<HomeStats> {
  const sessions = (await db.sessions.orderBy('startedAt').toArray()).filter(
    (s) => s.status === 'completed' || s.status === 'aborted',
  )

  // 連続記録: 今日(または昨日)から遡って連続してトレした日数
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const trainedDays = new Set(sessions.map((s) => dayKey(s.startedAt)))
  const dayMs = 24 * 3_600_000
  let streakDays = 0
  let cursor = new Date(now)
  if (!trainedDays.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - dayMs)
  while (trainedDays.has(dayKey(cursor))) {
    streakDays++
    cursor = new Date(cursor.getTime() - dayMs)
  }

  // 今週ボリューム: 直近7日の完了セット Σ重量×レップ
  const since = now.getTime() - 7 * dayMs
  let weeklyVolumeKg = 0
  for (const session of sessions.filter((s) => s.startedAt.getTime() >= since)) {
    const ses = await db.session_exercises.where('sessionId').equals(session.id!).toArray()
    for (const se of ses) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      for (const s of sets) {
        if (s.completedAt !== undefined && s.actualReps !== undefined) {
          weeklyVolumeKg += (s.actualWeightKg ?? 0) * s.actualReps
        }
      }
    }
  }
  return { streakDays, weeklyVolumeKg: Math.round(weeklyVolumeKg) }
}

/** ダッシュボード: 直近N日の日別部位別完了セット数(ISS-012)。トレなしの日も空点として含める */
export async function dailyVolumeHistory(days = 14, now = new Date()): Promise<WeeklyVolumePoint[]> {
  const exercises = await db.exercises.toArray()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))
  const dayMs = 24 * 3_600_000
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const points: WeeklyVolumePoint[] = []
  const indexByDayKey = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * dayMs)
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
    indexByDayKey.set(key, points.length)
    points.push({ weekLabel: `${day.getMonth() + 1}/${day.getDate()}`, sets: {} })
  }

  const rangeStart = today.getTime() - (days - 1) * dayMs
  const sessions = (await db.sessions.orderBy('startedAt').toArray()).filter(
    (s) => s.startedAt.getTime() >= rangeStart && s.status !== 'planned',
  )
  for (const session of sessions) {
    const d = session.startedAt
    const index = indexByDayKey.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    if (index === undefined) continue
    const point = points[index]
    const ses = await db.session_exercises.where('sessionId').equals(session.id!).toArray()
    for (const se of ses) {
      const muscle = exerciseById.get(se.exerciseId)?.primaryMuscle
      if (!muscle) continue
      const completed = (await db.sets.where('sessionExerciseId').equals(se.id!).toArray()).filter(
        (s) => s.completedAt !== undefined,
      ).length
      if (completed > 0) point.sets[muscle] = (point.sets[muscle] ?? 0) + completed
    }
  }
  return points
}

/** 成長ビュー(DEC-011)の入力: 完了/中断セッションの種目別セット実績。期間フィルタはエンジン側で行う */
export async function loadGrowthSessions(): Promise<GrowthSessionInput[]> {
  const exercises = await db.exercises.toArray()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))
  const sessions = (await db.sessions.orderBy('startedAt').toArray()).filter(
    (s) => s.status === 'completed' || s.status === 'aborted',
  )
  const result: GrowthSessionInput[] = []
  for (const session of sessions) {
    const ses = await db.session_exercises.where('sessionId').equals(session.id!).toArray()
    for (const se of ses) {
      const exercise = exerciseById.get(se.exerciseId)
      if (!exercise) continue
      const sets = (await db.sets.where('sessionExerciseId').equals(se.id!).toArray())
        .filter((s) => s.completedAt !== undefined)
        .map((s) => ({ weightKg: s.actualWeightKg ?? s.suggestedWeightKg, reps: s.actualReps }))
      if (sets.length === 0) continue
      result.push({
        performedAt: session.startedAt,
        exerciseId: exercise.id!,
        exerciseName: exercise.name,
        muscle: exercise.primaryMuscle,
        sets,
      })
    }
  }
  return result
}

/** アプリ設定(ISS-012)。UI設定のうちバックアップに含めたいものはlocalStorageではなくここへ */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? defaultValue : (row.value as T)
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}

/** 体重の随時記録(2-4)。プロフィールの現在体重も更新する */
export async function addBodyWeight(weightKg: number, bodyFatPct?: number): Promise<void> {
  await db.body_stats.add({ measuredAt: new Date(), weightKg, bodyFatPct })
  const profile = await db.profiles.orderBy('id').first()
  if (profile) {
    await db.profiles.update(profile.id!, { weightKg, updatedAt: new Date() })
  }
}

export async function listBodyStats(): Promise<BodyStat[]> {
  return db.body_stats.orderBy('measuredAt').toArray()
}

/** 写真の登録(2-1/2-5)。日付は自動 */
export async function addPhoto(pose: PhotoPose, blob: Blob, note?: string): Promise<void> {
  await db.photos.add({ takenAt: new Date(), pose, blob, note })
}

export async function listPhotos(pose?: PhotoPose): Promise<Photo[]> {
  const all = await db.photos.orderBy('takenAt').toArray()
  return pose ? all.filter((p) => p.pose === pose) : all
}

export async function deletePhoto(photoId: number): Promise<void> {
  await db.photos.delete(photoId)
}

/** 中断保存: 記録済みセットは残したままセッションを閉じる(F-05) */
export async function abortSession(sessionId: number): Promise<void> {
  await db.sessions.update(sessionId, { endedAt: new Date(), status: 'aborted' })
}

/** ログ一覧の1行分 */
export interface SessionSummary {
  session: Session
  totalSets: number
  completedSets: number
  /** 完遂率(0-100)。計画セットゼロならnull */
  completionRate: number | null
  durationMinutes: number | null
}

export async function listSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
    (s) => s.status === 'completed' || s.status === 'aborted',
  )
  const summaries: SessionSummary[] = []
  for (const session of sessions) {
    const sessionExercises = await db.session_exercises
      .where('sessionId')
      .equals(session.id!)
      .toArray()
    let totalSets = 0
    let completedSets = 0
    for (const se of sessionExercises) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      totalSets += sets.length
      completedSets += sets.filter((s) => s.completedAt !== undefined).length
    }
    summaries.push({
      session,
      totalSets,
      completedSets,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : null,
      durationMinutes: session.endedAt
        ? Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000))
        : null,
    })
  }
  return summaries
}

/** ログ詳細の追記(F-06: 全て任意・後から追記可) */
export async function updateSessionNotes(
  sessionId: number,
  patch: Partial<Pick<Session, 'rpe' | 'conditionNote' | 'handoverNote' | 'sessionNote'>>,
): Promise<void> {
  await db.sessions.update(sessionId, patch)
}

export async function updateExerciseNote(
  sessionExerciseId: number,
  patch: Partial<Pick<SessionExercise, 'note' | 'rpe'>>,
): Promise<void> {
  await db.session_exercises.update(sessionExerciseId, patch)
}

export async function updateSessionNote(sessionId: number, sessionNote: string): Promise<void> {
  await db.sessions.update(sessionId, { sessionNote: sessionNote || undefined })
}

/** 器具設定の更新(1-2) */
export async function updateEquipment(
  equipmentId: number,
  patch: { weightStepsKg?: number[]; minAngleDeg?: number; maxAngleDeg?: number },
): Promise<void> {
  await db.equipment.update(equipmentId, patch)
}

/** 種目への動画登録上限(ISS-003) */
export const MAX_VIDEOS_PER_EXERCISE = 3

/**
 * 種目にYouTube動画を登録する(ISS-003)。
 * 重複は無視。上限超過はfalseを返す(呼び出し側でエラー表示)
 */
export async function addExerciseVideo(exerciseId: number, videoId: string): Promise<boolean> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) return false
  const current = exercise.youtubeVideoIds ?? []
  if (current.includes(videoId)) return true
  if (current.length >= MAX_VIDEOS_PER_EXERCISE) return false
  await db.exercises.update(exerciseId, { youtubeVideoIds: [...current, videoId] })
  return true
}

export async function removeExerciseVideo(exerciseId: number, videoId: string): Promise<void> {
  const exercise = await db.exercises.get(exerciseId)
  if (!exercise) return
  await db.exercises.update(exerciseId, {
    youtubeVideoIds: (exercise.youtubeVideoIds ?? []).filter((id) => id !== videoId),
  })
}

/** 痛みフラグの解除(設定画面から) */
export async function resolveInjury(injuryId: number): Promise<void> {
  await db.injuries.update(injuryId, { isActive: 0 })
}

export type { Condition }
