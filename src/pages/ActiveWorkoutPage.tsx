import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import Modal from '../components/Modal'
import Stepper from '../components/Stepper'
import TimerOverlay from '../components/TimerOverlay'
import {
  FINISH_COPY,
  MENU_COPY,
  MUSCLE_GROUP_LABELS,
  WORKOUT_COPY,
} from '../constants/copy'
import {
  abortSession,
  finishSession,
  getActiveSession,
  loadWorkout,
  recordSet,
  undoSet,
  updateExerciseNote,
  updateSessionNote,
  type Workout,
} from '../db/queries'
import type { Exercise, MuscleGroup, SetRecord } from '../db/types'
import { snapToSteps } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'
import { useWakeLock } from '../hooks/useWakeLock'
import { unlockAudio } from '../utils/audio'
import { db } from '../db/db'

const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

/** セットごとの入力中の実績値(未確定はsuggestedを初期値にする) */
type Draft = { weightKg?: number; reps: number }

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map())
  const [timerSec, setTimerSec] = useState<number | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [autoTimer] = useLocalSetting('autoStartTimer', true)
  const [dumbbellSteps, setDumbbellSteps] = useState<number[]>([])

  useWakeLock(workout !== null)

  const reload = useCallback(async () => {
    const active = await getActiveSession()
    if (!active) {
      setNotFound(true)
      return
    }
    const loaded = await loadWorkout(active.id!)
    if (!loaded) {
      setNotFound(true)
      return
    }
    setWorkout(loaded)
  }, [])

  useEffect(() => {
    void reload()
    void db.equipment
      .where('type')
      .equals('dumbbell')
      .first()
      .then((d) => setDumbbellSteps(d?.weightStepsKg ?? []))
  }, [reload])

  useEffect(() => {
    if (notFound) navigate('/workout', { replace: true })
  }, [notFound, navigate])

  // 現在種目 = 未完了セットが残っている最初の種目
  const currentEntryIndex = useMemo(() => {
    if (!workout) return -1
    return workout.entries.findIndex((e) => e.sets.some((s) => s.completedAt === undefined))
  }, [workout])

  if (!workout) {
    return <p className="pt-10 text-center text-sm text-slate-500">…</p>
  }

  const draftFor = (set: SetRecord): Draft =>
    drafts.get(set.id!) ?? {
      weightKg: set.actualWeightKg ?? set.suggestedWeightKg,
      reps: set.actualReps ?? set.suggestedReps ?? 10,
    }

  const setDraft = (setId: number, draft: Draft) => {
    setDrafts((prev) => new Map(prev).set(setId, draft))
  }

  const completeSet = async (set: SetRecord, intervalSec?: number, atFailure = false) => {
    unlockAudio() // タップのたびにAudioContextの復帰を試みる(ISS-005)
    // ワークアウト全体の最終セットならタイマーを起動せず終了フォームへ直行(ISS-006)
    const isLastSetOfWorkout =
      workout!.entries.flatMap((e) => e.sets).filter((s) => s.completedAt === undefined).length === 1
    const draft = draftFor(set)
    await recordSet(set.id!, {
      actualWeightKg: draft.weightKg,
      actualReps: draft.reps,
      atFailure,
    })
    await reload()
    if (isLastSetOfWorkout) {
      setFinishOpen(true)
    } else if (autoTimer && intervalSec) {
      setTimerSec(intervalSec)
    }
  }

  const weightStep = (current: number, direction: 1 | -1): number => {
    if (dumbbellSteps.length === 0) return Math.max(0, current + direction * 0.5)
    return direction > 0
      ? snapToSteps(current, dumbbellSteps, 'up')
      : snapToSteps(current - 0.01, dumbbellSteps, 'down')
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{WORKOUT_COPY.title}</h1>

      <ul className="space-y-3">
        {workout.entries.map((entry, entryIndex) => {
          const isCurrent = entryIndex === currentEntryIndex
          return (
            <li
              key={entry.sessionExercise.id}
              className={`rounded-xl p-4 ${
                isCurrent ? 'bg-slate-900 ring-2 ring-orange-500' : 'bg-slate-900/60'
              }`}
            >
              {/* 種目名タップで詳細シート(ISS-001) */}
              <button
                type="button"
                className="flex min-h-11 w-full items-baseline justify-between text-left"
                onClick={() => setDetailExercise(entry.exercise)}
              >
                <p className="font-semibold">
                  {entry.exercise.name}
                  <span className="ml-1.5 text-xs text-slate-500">ⓘ</span>
                </p>
                <span className="text-xs text-slate-500">
                  {MUSCLE_GROUP_LABELS[entry.exercise.primaryMuscle]}
                </span>
              </button>

              <ul className="mt-2 space-y-2">
                {entry.sets.map((set) => {
                  const done = set.completedAt !== undefined
                  const draft = draftFor(set)
                  return (
                    <li
                      key={set.id}
                      className={`rounded-lg p-2 ${done ? 'bg-slate-800/40 opacity-70' : 'bg-slate-800/80'}`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {WORKOUT_COPY.setLabel(set.setNumber)}
                          {set.isPrAttempt && (
                            <span className="ml-1 rounded bg-orange-500 px-1 py-0.5 text-[10px] font-bold text-white">
                              {WORKOUT_COPY.prSet}
                            </span>
                          )}
                        </span>
                        <span>
                          {WORKOUT_COPY.suggested(
                            set.suggestedWeightKg !== undefined
                              ? MENU_COPY.weight(set.suggestedWeightKg)
                              : MENU_COPY.bodyweight,
                            set.suggestedReps !== undefined
                              ? `${set.suggestedReps}${WORKOUT_COPY.repsUnit}`
                              : '−',
                          )}
                        </span>
                      </div>

                      {done ? (
                        // 達成=緑 / 未達=黄で即フィードバック(未達は失敗ではなく調整材料のトーン: ISS-004)
                        <div
                          className={`mt-1 flex items-center justify-between rounded-md px-2 py-1 ${
                            set.achieved ? 'bg-green-500/10' : 'bg-yellow-500/10'
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {set.actualWeightKg !== undefined ? `${set.actualWeightKg}kg × ` : ''}
                            {set.actualReps}
                            {WORKOUT_COPY.repsUnit}
                            <span
                              className={`ml-2 text-xs font-bold ${
                                set.achieved ? 'text-green-400' : 'text-yellow-300'
                              }`}
                            >
                              {set.achieved ? WORKOUT_COPY.achievedLabel : WORKOUT_COPY.missedLabel}
                            </span>
                            {set.atFailure && (
                              <span className="ml-1.5 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                {WORKOUT_COPY.atFailureLabel}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            className="h-11 rounded-lg px-3 text-xs text-slate-400 active:bg-slate-700"
                            onClick={async () => {
                              await undoSet(set.id!)
                              await reload()
                            }}
                          >
                            {WORKOUT_COPY.undo}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 space-y-1.5">
                          <div className="flex justify-center gap-3">
                            {set.suggestedWeightKg !== undefined && (
                              <Stepper
                                label={WORKOUT_COPY.weightUnit}
                                value={draft.weightKg ?? 0}
                                onChange={(w) => setDraft(set.id!, { ...draft, weightKg: w })}
                                step={weightStep}
                              />
                            )}
                            <Stepper
                              label={WORKOUT_COPY.repsUnit}
                              value={draft.reps}
                              onChange={(r) => setDraft(set.id!, { ...draft, reps: r })}
                              step={(cur, dir) => Math.max(0, cur + dir)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="h-11 flex-[2] rounded-lg bg-orange-500 text-sm font-bold text-white active:bg-orange-600"
                              onClick={() => completeSet(set, set.intervalSec)}
                            >
                              {WORKOUT_COPY.done}
                            </button>
                            <button
                              type="button"
                              className="h-11 flex-1 rounded-lg bg-slate-700/60 text-xs font-semibold text-red-300 active:bg-slate-700"
                              onClick={() => completeSet(set, set.intervalSec, true)}
                            >
                              🔥 {WORKOUT_COPY.atFailure}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              <textarea
                defaultValue={entry.sessionExercise.note ?? ''}
                placeholder={WORKOUT_COPY.exerciseNotePlaceholder}
                rows={1}
                className="mt-2 w-full rounded-lg bg-slate-800/60 p-2 text-sm placeholder:text-slate-600"
                onBlur={(e) =>
                  void updateExerciseNote(entry.sessionExercise.id!, {
                    note: e.target.value || undefined,
                  })
                }
              />
            </li>
          )
        })}
      </ul>

      <textarea
        defaultValue={workout.session.sessionNote ?? ''}
        placeholder={WORKOUT_COPY.sessionNotePlaceholder}
        rows={2}
        className="w-full rounded-xl bg-slate-900 p-3 text-sm placeholder:text-slate-600"
        onBlur={(e) => void updateSessionNote(workout.session.id!, e.target.value)}
      />

      <button
        type="button"
        className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
        onClick={() => setFinishOpen(true)}
      >
        {WORKOUT_COPY.finish}
      </button>
      <button
        type="button"
        className="h-12 w-full rounded-xl bg-slate-800 text-sm text-slate-300 active:bg-slate-700"
        onClick={async () => {
          if (window.confirm(WORKOUT_COPY.interruptConfirm)) {
            await abortSession(workout.session.id!)
            navigate('/log')
          }
        }}
      >
        {WORKOUT_COPY.interrupt}
      </button>

      {detailExercise && (
        <ExerciseDetailSheet exercise={detailExercise} onClose={() => setDetailExercise(null)} />
      )}

      {timerSec !== null && <TimerOverlay initialSec={timerSec} onDone={() => setTimerSec(null)} />}

      {finishOpen && (
        <FinishModal
          onClose={() => setFinishOpen(false)}
          onSave={async (input) => {
            await finishSession(workout.session.id!, input)
            // セッション後サマリー(F-07)へ
            navigate(`/summary/${workout.session.id}`, { replace: true })
          }}
        />
      )}
    </section>
  )
}

interface FinishModalProps {
  onClose: () => void
  onSave: (input: {
    rpe?: number
    conditionNote?: string
    handoverNote?: string
    painParts: { part: MuscleGroup; note?: string }[]
  }) => Promise<void>
}

function FinishModal({ onClose, onSave }: FinishModalProps) {
  const [rpe, setRpe] = useState<number | undefined>()
  const [conditionNote, setConditionNote] = useState('')
  const [handoverNote, setHandoverNote] = useState('')
  const [painParts, setPainParts] = useState<MuscleGroup[]>([])
  const [painNote, setPainNote] = useState('')

  return (
    <Modal title={FINISH_COPY.title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">{FINISH_COPY.rpe}</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(rpe === n ? undefined : n)}
                className={`h-11 rounded-lg text-sm font-bold ${
                  rpe === n ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={conditionNote}
          onChange={(e) => setConditionNote(e.target.value)}
          placeholder={FINISH_COPY.conditionNote}
          rows={2}
          className="w-full rounded-lg bg-slate-800 p-2 text-sm placeholder:text-slate-500"
        />

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">{FINISH_COPY.painTitle}</p>
          <div className="grid grid-cols-4 gap-2">
            {ALL_MUSCLES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setPainParts((prev) =>
                    prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                  )
                }
                className={`h-11 rounded-lg text-sm font-bold ${
                  painParts.includes(m) ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
          {painParts.length > 0 && (
            <>
              <textarea
                value={painNote}
                onChange={(e) => setPainNote(e.target.value)}
                placeholder={FINISH_COPY.painNote}
                rows={1}
                className="mt-2 w-full rounded-lg bg-slate-800 p-2 text-sm placeholder:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">{FINISH_COPY.painHint}</p>
            </>
          )}
        </div>

        <textarea
          value={handoverNote}
          onChange={(e) => setHandoverNote(e.target.value)}
          placeholder={`${FINISH_COPY.handover}(${FINISH_COPY.handoverPlaceholder})`}
          rows={2}
          className="w-full rounded-lg bg-slate-800 p-2 text-sm placeholder:text-slate-500"
        />

        <button
          type="button"
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
          onClick={() =>
            void onSave({
              rpe,
              conditionNote,
              handoverNote,
              painParts: painParts.map((part) => ({ part, note: painNote || undefined })),
            })
          }
        >
          {FINISH_COPY.save}
        </button>
      </div>
    </Modal>
  )
}
