import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import Modal from '../components/Modal'
import {
  FINISH_COPY,
  MENU_COPY,
  MUSCLE_GROUP_LABELS,
  TIMER_COPY,
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
  type WorkoutEntry,
} from '../db/queries'
import { db } from '../db/db'
import type { Exercise, MuscleGroup, SetRecord } from '../db/types'
import { snapToSteps } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'
import { useWakeLock } from '../hooks/useWakeLock'
import { audioReady, countBeep, finishChime, unlockAudio } from '../utils/audio'
import { vibrate } from '../utils/vibrate'

const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

type Draft = { weightKg?: number; reps: number }

/** 実行画面ステートマシン(仕様§4): LOGGING=入力主役 / RESTING=タイマー主役 */
type Mode =
  | { kind: 'logging' }
  | { kind: 'resting'; endAt: number; totalSec: number; finished: boolean }

/** 現在(=最初の未完了)セットの位置 */
interface Position {
  entry: WorkoutEntry
  set: SetRecord
  setIndex: number
}

function firstIncomplete(workout: Workout): Position | null {
  for (const entry of workout.entries) {
    const setIndex = entry.sets.findIndex((s) => s.completedAt === undefined)
    if (setIndex >= 0) return { entry, set: entry.sets[setIndex], setIndex }
  }
  return null
}

export default function ActiveWorkoutPage() {
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<Mode>({ kind: 'logging' })
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map())
  const [finishOpen, setFinishOpen] = useState(false)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [soundOk, setSoundOk] = useState(audioReady)
  const [autoTimer] = useLocalSetting('autoStartTimer', true)
  const [dumbbellSteps, setDumbbellSteps] = useState<number[]>([])
  const lastBeepSecRef = useRef<number | null>(null)

  useWakeLock(workout !== null)

  const reload = useCallback(async () => {
    const active = await getActiveSession()
    if (!active) {
      setNotFound(true)
      return null
    }
    const loaded = await loadWorkout(active.id!)
    if (!loaded) {
      setNotFound(true)
      return null
    }
    setWorkout(loaded)
    return loaded
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

  // RESTINGのカウントダウン(終了時刻ベース・バックグラウンド耐性)
  useEffect(() => {
    if (mode.kind !== 'resting' || mode.finished) return
    const tick = () => {
      const rest = mode.endAt - Date.now()
      setSoundOk(audioReady())
      const restSec = Math.ceil(rest / 1000)
      if (rest > 0 && restSec <= 3 && lastBeepSecRef.current !== restSec) {
        lastBeepSecRef.current = restSec
        countBeep()
      }
      if (rest <= 0) {
        finishChime()
        vibrate([400, 150, 400])
        setMode({ ...mode, finished: true })
      } else {
        // 再レンダリングして残り秒を更新
        setMode((m) => (m.kind === 'resting' ? { ...m } : m))
      }
    }
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [mode])

  // 終了点滅(iOSバイブ非対応の視覚フォールバック)を見せてからLOGGINGへ(sec==0→自動遷移)
  useEffect(() => {
    if (mode.kind === 'resting' && mode.finished) {
      const id = setTimeout(() => setMode({ kind: 'logging' }), 1400)
      return () => clearTimeout(id)
    }
  }, [mode])

  const position = useMemo(() => (workout ? firstIncomplete(workout) : null), [workout])

  if (!workout) {
    return <p className="pt-10 text-center text-sm text-ink-dim">…</p>
  }

  const draftFor = (set: SetRecord): Draft =>
    drafts.get(set.id!) ?? {
      weightKg: set.actualWeightKg ?? set.suggestedWeightKg,
      reps: set.actualReps ?? set.suggestedReps ?? 10,
    }

  const record = async (atFailure = false) => {
    if (!position) return
    unlockAudio() // タップのたびにAudioContextの復帰を試みる(ISS-005)
    const isLastSetOfWorkout =
      workout.entries.flatMap((e) => e.sets).filter((s) => s.completedAt === undefined).length === 1
    const draft = draftFor(position.set)
    await recordSet(position.set.id!, {
      actualWeightKg: draft.weightKg,
      actualReps: draft.reps,
      atFailure,
    })
    await reload()
    if (isLastSetOfWorkout) {
      // 全体の最終セットはタイマーなしでサマリーへ(ISS-006 / §0-1)
      setFinishOpen(true)
      setMode({ kind: 'logging' })
    } else if (autoTimer && position.set.intervalSec) {
      lastBeepSecRef.current = null
      setMode({
        kind: 'resting',
        endAt: Date.now() + position.set.intervalSec * 1000,
        totalSec: position.set.intervalSec,
        finished: false,
      })
    }
  }

  const undoLast = async () => {
    const done = workout.entries
      .flatMap((e) => e.sets)
      .filter((s) => s.completedAt !== undefined)
      .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
    const last = done[done.length - 1]
    if (!last) return
    await undoSet(last.id!)
    await reload()
    setMode({ kind: 'logging' })
  }

  const weightStep = (current: number, direction: 1 | -1): number => {
    if (dumbbellSteps.length === 0) return Math.max(0, current + direction * 0.5)
    // §0-3: 器具の重量配列にスナップ(前後のステップへ)
    return direction > 0
      ? snapToSteps(current, dumbbellSteps, 'up')
      : snapToSteps(current - 0.01, dumbbellSteps, 'down')
  }

  const totalSetsOfCurrent = position?.entry.sets.length ?? 0
  const lastDone = position?.entry.sets
    .filter((s) => s.completedAt !== undefined)
    .at(-1)

  return (
    <section className="space-y-5">
      {/* ヘッダー(§4共通) */}
      <header className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-h-11 text-left"
          onClick={() => position && setDetailExercise(position.entry.exercise)}
        >
          <p className="label-mono text-[10px] text-ink-dim">{WORKOUT_COPY.brandLabel}</p>
          <h1 className="text-[22px] font-black leading-tight text-ink">
            {position ? position.entry.exercise.name : WORKOUT_COPY.title}
            {position && <span className="ml-1.5 text-xs font-normal text-ink-dim">ⓘ</span>}
          </h1>
        </button>
        {position && (
          <span className="label-mono shrink-0 rounded-chip border border-line-ember px-2.5 py-1.5 text-[13px] font-bold tracking-normal text-ink-mid">
            {WORKOUT_COPY.setChip(position.setIndex + 1, totalSetsOfCurrent)}
          </span>
        )}
      </header>

      {mode.kind === 'resting' && position ? (
        <RestingView
          key="resting"
          mode={mode}
          soundOk={soundOk}
          next={position}
          onAdjust={(delta) => {
            unlockAudio()
            setMode((m) =>
              m.kind === 'resting' && !m.finished
                ? {
                    ...m,
                    endAt: Math.max(Date.now() + 1000, m.endAt + delta * 1000),
                    totalSec: Math.max(1, m.totalSec + delta),
                  }
                : m,
            )
          }}
          onSkip={() => {
            unlockAudio()
            setMode({ kind: 'logging' })
          }}
          onEnableSound={() => {
            unlockAudio()
            setSoundOk(audioReady())
          }}
        />
      ) : position ? (
        <div key={`logging-${position.set.id}`} className="anim-rise space-y-4">
          {/* NOWラベル(§4 LOGGING) */}
          <p className="label-mono anim-pulse text-center text-[11px] text-molten-bright">
            {WORKOUT_COPY.nowSet(position.setIndex + 1)}
            {position.set.isPrAttempt && ` ・ ${WORKOUT_COPY.prSet}`}
          </p>

          {/* 重量カード */}
          {position.set.suggestedWeightKg !== undefined && (
            <HeroStepper
              label={WORKOUT_COPY.weightLabel}
              display={`${draftFor(position.set).weightKg ?? 0}`}
              onStep={(dir) => {
                const draft = draftFor(position.set)
                setDrafts((prev) =>
                  new Map(prev).set(position.set.id!, {
                    ...draft,
                    weightKg: weightStep(draft.weightKg ?? 0, dir),
                  }),
                )
              }}
            />
          )}

          {/* レップカード */}
          <HeroStepper
            label={WORKOUT_COPY.repsLabel}
            display={`${draftFor(position.set).reps}`}
            onStep={(dir) => {
              const draft = draftFor(position.set)
              setDrafts((prev) =>
                new Map(prev).set(position.set.id!, {
                  ...draft,
                  reps: Math.max(0, draft.reps + dir),
                }),
              )
            }}
          />

          {/* 記録CTA+限界(ISS-004維持 / §0-4) */}
          <button type="button" className="pill-molten h-14 w-full text-[16px]" onClick={() => void record()}>
            {WORKOUT_COPY.done}
          </button>
          <button
            type="button"
            className="pill-ghost h-12 w-full text-xs text-destructive"
            onClick={() => void record(true)}
          >
            🔥 {WORKOUT_COPY.atFailure}
          </button>

          <ProgressDots entry={position.entry} currentIndex={position.setIndex} />

          {/* 直前セットのフィードバック(達成=緑/調整中=黄) */}
          {lastDone && (
            <div
              className={`flex items-center justify-between rounded-chip px-3 py-2 text-sm ${
                lastDone.achieved ? 'bg-achieved/10' : 'bg-adjusting/10'
              }`}
            >
              <span>
                {WORKOUT_COPY.lastRecorded(lastDone.setNumber)}:{' '}
                <span className="font-bold">
                  {lastDone.actualWeightKg !== undefined ? `${lastDone.actualWeightKg}kg × ` : ''}
                  {lastDone.actualReps}
                  {WORKOUT_COPY.repsUnit}
                </span>
                <span
                  className={`ml-2 text-xs font-bold ${lastDone.achieved ? 'text-achieved' : 'text-adjusting'}`}
                >
                  {lastDone.achieved ? WORKOUT_COPY.achievedLabel : WORKOUT_COPY.missedLabel}
                </span>
                {lastDone.atFailure && (
                  <span className="ml-1.5 rounded-chip bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                    {WORKOUT_COPY.atFailureLabel}
                  </span>
                )}
              </span>
              <button
                type="button"
                className="h-11 shrink-0 px-2 text-xs text-ink-dim active:text-ink-mid"
                onClick={() => void undoLast()}
              >
                {WORKOUT_COPY.undo}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-mid">{MENU_COPY.emptyMenu}</p>
      )}

      {/* メモ・終了系(折りたたみで低ノイズに) */}
      <div className="card-ember">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between px-4 text-sm text-ink-mid"
          onClick={() => setNotesOpen((v) => !v)}
        >
          {WORKOUT_COPY.notesSection}
          <span>{notesOpen ? '▲' : '▼'}</span>
        </button>
        {notesOpen && (
          <div className="space-y-2 px-4 pb-4">
            {position && (
              <textarea
                defaultValue={position.entry.sessionExercise.note ?? ''}
                placeholder={WORKOUT_COPY.exerciseNotePlaceholder}
                rows={1}
                className="w-full rounded-chip border border-line-ember bg-transparent p-2 text-sm text-ink placeholder:text-ink-dim"
                onBlur={(e) =>
                  void updateExerciseNote(position.entry.sessionExercise.id!, {
                    note: e.target.value || undefined,
                  })
                }
              />
            )}
            <textarea
              defaultValue={workout.session.sessionNote ?? ''}
              placeholder={WORKOUT_COPY.sessionNotePlaceholder}
              rows={2}
              className="w-full rounded-chip border border-line-ember bg-transparent p-2 text-sm text-ink placeholder:text-ink-dim"
              onBlur={(e) => void updateSessionNote(workout.session.id!, e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="pill-ghost h-12 flex-1 text-sm"
          onClick={async () => {
            if (window.confirm(WORKOUT_COPY.interruptConfirm)) {
              await abortSession(workout.session.id!)
              navigate('/log')
            }
          }}
        >
          {WORKOUT_COPY.interrupt}
        </button>
        <button
          type="button"
          className="pill-molten h-12 flex-1 text-sm"
          onClick={() => setFinishOpen(true)}
        >
          {WORKOUT_COPY.finish}
        </button>
      </div>

      {detailExercise && (
        <ExerciseDetailSheet exercise={detailExercise} onClose={() => setDetailExercise(null)} />
      )}

      {finishOpen && (
        <FinishModal
          onClose={() => setFinishOpen(false)}
          onSave={async (input) => {
            await finishSession(workout.session.id!, input)
            navigate(`/summary/${workout.session.id}`, { replace: true })
          }}
        />
      )}
    </section>
  )
}

/** ヒーロー数字ステッパー(§4: Anton 64px + 56px円形±) */
function HeroStepper({
  label,
  display,
  onStep,
}: {
  label: string
  display: string
  onStep: (direction: 1 | -1) => void
}) {
  return (
    <div className="card-ember px-4 py-3">
      <p className="label-mono mb-1 text-center text-[10px] text-accent-dim">{label}</p>
      <div className="flex items-center justify-between">
        <StepButton sign="−" onClick={() => onStep(-1)} />
        <span className="num-hero glow-text text-[64px] leading-none">{display}</span>
        <StepButton sign="+" onClick={() => onStep(1)} />
      </div>
    </div>
  )
}

function StepButton({ sign, onClick }: { sign: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-pill border border-line-ember text-2xl text-ink-mid active:border-molten active:text-molten"
    >
      {sign}
    </button>
  )
}

/** セット進捗ドット(完了=molten / 現在=molten-bright枠 / 未=line-ember) */
function ProgressDots({ entry, currentIndex }: { entry: WorkoutEntry; currentIndex: number }) {
  return (
    <div className="flex justify-center gap-2.5">
      {entry.sets.map((s, i) => (
        <span
          key={s.id}
          className={`h-2.5 w-2.5 rounded-pill ${
            s.completedAt !== undefined
              ? 'bg-molten'
              : i === currentIndex
                ? 'border border-molten-bright'
                : 'bg-line-ember'
          }`}
        />
      ))}
    </div>
  )
}

const RING_RADIUS = 132
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** RESTING(§4): 残時間リングが主役+NEXTカード */
function RestingView({
  mode,
  next,
  soundOk,
  onAdjust,
  onSkip,
  onEnableSound,
}: {
  mode: Extract<Mode, { kind: 'resting' }>
  next: Position
  soundOk: boolean
  onAdjust: (deltaSec: number) => void
  onSkip: () => void
  onEnableSound: () => void
}) {
  const remainingMs = Math.max(0, mode.endAt - Date.now())
  const remainingSec = Math.ceil(remainingMs / 1000)
  const progress = mode.totalSec > 0 ? remainingMs / (mode.totalSec * 1000) : 0
  const draftWeight = next.set.actualWeightKg ?? next.set.suggestedWeightKg

  return (
    <div className={`anim-rise space-y-5 ${mode.finished ? 'anim-pulse' : ''}`}>
      {!soundOk && !mode.finished && (
        <button
          type="button"
          className="mx-auto block rounded-pill bg-adjusting/15 px-4 py-2 text-xs text-adjusting"
          onClick={onEnableSound}
        >
          🔇 {TIMER_COPY.soundSuspended}
        </button>
      )}

      {/* 残時間リング(300px・溶鉄グラデ・グロー・emberPulse) */}
      <div className="anim-pulse relative mx-auto h-[300px] w-[300px]">
        <svg
          width="300"
          height="300"
          viewBox="0 0 300 300"
          aria-hidden="true"
          style={{ filter: 'drop-shadow(0 0 12px rgba(255,92,26,.65))' }}
        >
          <defs>
            {/* 溶鉄グラデ(§1・45°) */}
            <linearGradient id="moltenRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB300" />
              <stop offset="60%" stopColor="#FF5C1A" />
              <stop offset="100%" stopColor="#D8321A" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="150" r={RING_RADIUS} fill="none" stroke="#3A2213" strokeWidth="10" />
          <circle
            cx="150"
            cy="150"
            r={RING_RADIUS}
            fill="none"
            stroke={mode.finished ? '#FFB300' : 'url(#moltenRing)'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            transform="rotate(-90 150 150)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="label-mono text-[11px] text-accent-dim">
            {mode.finished ? TIMER_COPY.finished : WORKOUT_COPY.intervalLabel}
          </p>
          <p className="num-hero glow-text text-[88px] leading-none">{remainingSec}</p>
          <p className="label-mono text-[11px] tracking-normal text-ink-dim">/ {mode.totalSec}s</p>
        </div>
      </div>

      {/* 操作(§0-2: ±15秒+スキップを炉心スタイルで) */}
      <div className="flex justify-center gap-3">
        <button type="button" className="pill-ghost h-12 px-5 text-sm" onClick={() => onAdjust(-15)}>
          −15{TIMER_COPY.secondsSuffix}
        </button>
        <button type="button" className="pill-ghost h-12 px-5 text-sm" onClick={() => onAdjust(15)}>
          +15{TIMER_COPY.secondsSuffix}
        </button>
        <button type="button" className="pill-molten h-12 px-6 text-sm" onClick={onSkip}>
          {TIMER_COPY.skip}
        </button>
      </div>

      {/* NEXTカード(§4) */}
      <div className="card-ember px-4 py-3">
        <p className="label-mono text-[10px] text-accent-dim">
          {WORKOUT_COPY.nextLabel} — {WORKOUT_COPY.setLabel(next.setIndex + 1)}
          {next.setIndex === 0 && ` ・${next.entry.exercise.name}`}
        </p>
        <div className="mt-1 flex items-end justify-between">
          <p className="num-hero text-[34px] leading-none">
            {draftWeight !== undefined ? `${draftWeight}kg × ` : ''}
            {next.set.suggestedReps ?? '−'}
            <span className="ml-1 text-sm text-accent-dim">{WORKOUT_COPY.repsUnit}</span>
          </p>
          <ProgressDots entry={next.entry} currentIndex={next.setIndex} />
        </div>
      </div>
    </div>
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
          <p className="mb-1 text-xs font-bold text-ink-mid">{FINISH_COPY.rpe}</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(rpe === n ? undefined : n)}
                className={`h-11 rounded-chip text-sm font-bold ${
                  rpe === n ? 'bg-molten text-white' : 'border border-line-ember text-ink-mid'
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
          className="w-full rounded-chip border border-line-ember bg-transparent p-2 text-sm text-ink placeholder:text-ink-dim"
        />

        <div>
          <p className="mb-1 text-xs font-bold text-ink-mid">{FINISH_COPY.painTitle}</p>
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
                className={`h-11 rounded-chip text-sm font-bold ${
                  painParts.includes(m)
                    ? 'bg-destructive text-forge-black'
                    : 'border border-line-ember text-ink-mid'
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
                className="mt-2 w-full rounded-chip border border-line-ember bg-transparent p-2 text-sm text-ink placeholder:text-ink-dim"
              />
              <p className="mt-1 text-xs text-ink-dim">{FINISH_COPY.painHint}</p>
            </>
          )}
        </div>

        <textarea
          value={handoverNote}
          onChange={(e) => setHandoverNote(e.target.value)}
          placeholder={`${FINISH_COPY.handover}(${FINISH_COPY.handoverPlaceholder})`}
          rows={2}
          className="w-full rounded-chip border border-line-ember bg-transparent p-2 text-sm text-ink placeholder:text-ink-dim"
        />

        <button
          type="button"
          className="pill-molten h-14 w-full text-[16px]"
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
