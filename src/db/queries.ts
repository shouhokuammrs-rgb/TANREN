// DBアクセス層。エンジンへのスナップショット作成とセッションの読み書きを集約する

import { db } from './db'
import type {
  Condition,
  Exercise,
  MuscleGroup,
  Session,
  SessionExercise,
  SetRecord,
} from './types'
import type {
  EngineContext,
  ExerciseHistoryEntry,
  GeneratedMenu,
  MenuRequest,
  MuscleStimulus,
} from '../engine/types'
import { patternBase1RmFrom, prAttemptWeightKg } from '../engine'

/** エンジン入力のスナップショットを組み立てる */
export async function loadEngineContext(now = new Date()): Promise<EngineContext> {
  const [profile, equipment, exercises, injuries, strengthMarks] = await Promise.all([
    db.profiles.orderBy('id').first(),
    db.equipment.where('isActive').equals(1).toArray(),
    db.exercises.toArray(),
    db.injuries.where('isActive').equals(1).toArray(),
    db.strength_marks.toArray(),
  ])

  const dumbbell = equipment.find((e) => e.type === 'dumbbell')
  const bench = equipment.find((e) => e.type === 'bench')

  // 直近の完了・中断セッション(部分実施も刺激としてカウント)を新しい順に走査
  const sessions = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter(
    (s) => s.status === 'completed' || s.status === 'aborted',
  )

  const lastPerformance = new Map<number, ExerciseHistoryEntry>()
  const stimulusByMuscle = new Map<MuscleGroup, MuscleStimulus>()
  const exerciseById = new Map(exercises.map((e) => [e.id!, e]))

  for (const session of sessions) {
    const sessionExercises = await db.session_exercises
      .where('sessionId')
      .equals(session.id!)
      .toArray()
    const muscleSetCount = new Map<MuscleGroup, number>()

    for (const se of sessionExercises) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id!).toArray()
      const completed = sets.filter((s) => s.completedAt !== undefined)
      if (completed.length === 0) continue

      if (!lastPerformance.has(se.exerciseId)) {
        lastPerformance.set(se.exerciseId, {
          exerciseId: se.exerciseId,
          performedAt: session.startedAt,
          sets: completed.map((s) => ({
            weightKg: s.actualWeightKg ?? s.suggestedWeightKg,
            reps: s.actualReps,
            achieved: s.achieved,
          })),
        })
      }

      const muscle = exerciseById.get(se.exerciseId)?.primaryMuscle
      if (muscle) {
        muscleSetCount.set(muscle, (muscleSetCount.get(muscle) ?? 0) + completed.length)
      }
    }

    for (const [muscle, setCount] of muscleSetCount) {
      if (!stimulusByMuscle.has(muscle)) {
        stimulusByMuscle.set(muscle, { muscle, at: session.startedAt, setCount })
      }
    }
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
    muscleStimuli: [...stimulusByMuscle.values()],
    activeInjuries: [...new Set(injuries.map((i) => i.bodyPart))],
    patternBase1Rm: patternBase1RmFrom(strengthMarks),
  }
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

/** 生成メニューからin_progressセッションを作成し、sessionIdを返す */
export async function startSession(
  menu: GeneratedMenu,
  request: MenuRequest,
  dumbbellStepsKg: number[],
): Promise<number> {
  return db.transaction('rw', [db.sessions, db.session_exercises, db.sets], async () => {
    const sessionId = (await db.sessions.add({
      startedAt: new Date(),
      status: 'in_progress',
      muscles: menu.muscles,
      availableMinutes: request.availableMinutes,
      condition: request.condition,
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
  actual: { actualWeightKg?: number; actualReps: number },
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
    completedAt: new Date(),
  })
}

export async function undoSet(setId: number): Promise<void> {
  await db.sets.update(setId, {
    actualWeightKg: undefined,
    actualReps: undefined,
    achieved: undefined,
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
