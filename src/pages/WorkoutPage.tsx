import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import Modal from '../components/Modal'
import {
  CONDITION_LABELS,
  HEARING_COPY,
  MEAL_TIMING_LABELS,
  MENU_COPY,
  MOVEMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  STRENGTH_COPY,
  formatDate,
} from '../constants/copy'
import {
  abortSession,
  getActiveSession,
  loadEngineContext,
  loadLastHandoverNote,
  loadLastSleepTimes,
  startSession,
} from '../db/queries'
import type { Condition, Exercise, MealTiming, MuscleGroup, Session } from '../db/types'
import { calcSleepHours } from '../utils/time'
import {
  alternativesFor,
  estimatedMinutes,
  generateMenu,
  prescriptionFor,
} from '../engine'
import type { EngineContext, GeneratedMenu, MenuItem, MenuRequest } from '../engine/types'
import { useLocalSetting } from '../hooks/useLocalSetting'

const TIME_OPTIONS = [15, 30, 45, 60, 90]
const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[]
const MEAL_TIMINGS = Object.keys(MEAL_TIMING_LABELS) as MealTiming[]

type Phase =
  | { kind: 'loading' }
  | { kind: 'resume'; session: Session }
  | { kind: 'hearing' }
  | { kind: 'menu'; ctx: EngineContext; request: MenuRequest; menu: GeneratedMenu }

export default function WorkoutPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [minutes, setMinutes] = useState<number | null>(null)
  const [muscleMode, setMuscleMode] = useState<'omakase' | 'choose' | null>(null)
  const [muscles, setMuscles] = useState<MuscleGroup[]>([])
  const [handover, setHandover] = useState<string | undefined>()
  const [picker, setPicker] = useState<{ mode: 'swap' | 'add'; itemIndex?: number } | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  // 初回生成時のみ「提案は目安」の注意を出す(ISS-002)
  const [calibNoteShown, setCalibNoteShown] = useLocalSetting('calibrationNoteShown', false)
  // コンディション詳細(ISS-007・任意・折りたたみデフォルト閉)
  const [detailOpen, setDetailOpen] = useState(false)
  const [sleepStart, setSleepStart] = useState('')
  const [sleepEnd, setSleepEnd] = useState('')
  const [mealTiming, setMealTiming] = useState<MealTiming | null>(null)

  useEffect(() => {
    void (async () => {
      const active = await getActiveSession()
      setHandover(await loadLastHandoverNote())
      // 時刻ピッカーのデフォルトは前回値
      const lastSleep = await loadLastSleepTimes()
      setSleepStart((prev) => prev || (lastSleep.sleepStart ?? ''))
      setSleepEnd((prev) => prev || (lastSleep.sleepEnd ?? ''))
      setPhase(active ? { kind: 'resume', session: active } : { kind: 'hearing' })
    })()
  }, [])

  const generate = async (request: MenuRequest) => {
    const ctx = await loadEngineContext()
    setPhase({ kind: 'menu', ctx, request, menu: generateMenu(ctx, request) })
  }

  const onConditionTap = (condition: Condition) => {
    if (minutes === null || muscleMode === null) return
    void generate({
      availableMinutes: minutes,
      targetMuscles: muscleMode === 'omakase' ? [] : muscles,
      condition,
    })
  }

  const resetHearing = () => {
    setMinutes(null)
    setMuscleMode(null)
    setMuscles([])
    setPhase({ kind: 'hearing' })
  }

  if (phase.kind === 'loading') {
    return <p className="pt-10 text-center text-sm text-ink-dim">…</p>
  }

  if (phase.kind === 'resume') {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">{HEARING_COPY.resumeTitle}</h1>
        <p className="text-sm text-ink-mid">
          {HEARING_COPY.resumeBody(formatDate(phase.session.startedAt))}
        </p>
        <button
          type="button"
          className="h-14 w-full rounded-card bg-molten font-bold text-white active:bg-molten-bright"
          onClick={() => navigate('/workout/active')}
        >
          {HEARING_COPY.resume}
        </button>
        <button
          type="button"
          className="h-12 w-full rounded-card bg-line-ember/40 text-sm text-ink-mid active:bg-line-ember"
          onClick={async () => {
            await abortSession(phase.session.id!)
            resetHearing()
          }}
        >
          {HEARING_COPY.discard}
        </button>
      </section>
    )
  }

  if (phase.kind === 'hearing') {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">{HEARING_COPY.title}</h1>

        {handover && (
          <div className="rounded-card border border-molten/40 bg-ember-tint p-3 text-sm">
            <p className="mb-1 text-xs font-semibold text-molten-bright">
              {HEARING_COPY.handoverTitle}
            </p>
            {handover}
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink-mid">{HEARING_COPY.stepTime}</h2>
          <div className="grid grid-cols-5 gap-2">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`h-14 rounded-card text-sm font-bold ${
                  minutes === m ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {m}
                <span className="text-[10px] font-normal">{HEARING_COPY.minutesSuffix}</span>
              </button>
            ))}
          </div>
        </div>

        {minutes !== null && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink-mid">
              {HEARING_COPY.stepMuscles}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMuscleMode('omakase')
                  setMuscles([])
                }}
                className={`h-14 rounded-card text-sm font-bold ${
                  muscleMode === 'omakase' ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {HEARING_COPY.omakase}
              </button>
              <button
                type="button"
                onClick={() => setMuscleMode('choose')}
                className={`h-14 rounded-card text-sm font-bold ${
                  muscleMode === 'choose' ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {HEARING_COPY.chooseMuscles}
              </button>
            </div>
            {muscleMode === 'choose' && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ALL_MUSCLES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setMuscles((prev) =>
                        prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                      )
                    }
                    className={`h-12 rounded-card text-sm font-bold ${
                      muscles.includes(m) ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                    }`}
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* コンディション詳細(ISS-007): 折りたたみ・任意。3タップフローは阻害しない */}
        <div className="rounded-card bg-ember-tint">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between px-4 text-sm text-ink-mid"
            onClick={() => setDetailOpen((v) => !v)}
          >
            {HEARING_COPY.detailSection}
            <span>{detailOpen ? '▲' : '▼'}</span>
          </button>
          {detailOpen && (
            <div className="space-y-3 px-4 pb-4">
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs text-ink-mid">
                  {HEARING_COPY.sleepStart}
                  <input
                    type="time"
                    value={sleepStart}
                    onChange={(e) => setSleepStart(e.target.value)}
                    className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
                  />
                </label>
                <label className="flex-1 text-xs text-ink-mid">
                  {HEARING_COPY.sleepEnd}
                  <input
                    type="time"
                    value={sleepEnd}
                    onChange={(e) => setSleepEnd(e.target.value)}
                    className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
                  />
                </label>
              </div>
              {calcSleepHours(sleepStart, sleepEnd) !== null && (
                <p className="text-xs text-molten-bright">
                  {HEARING_COPY.sleepHours(calcSleepHours(sleepStart, sleepEnd)!)}
                </p>
              )}
              <div>
                <p className="mb-1 text-xs text-ink-mid">{HEARING_COPY.mealLabel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {MEAL_TIMINGS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMealTiming(mealTiming === m ? null : m)}
                      className={`h-11 rounded-chip text-xs font-semibold ${
                        mealTiming === m ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                      }`}
                    >
                      {MEAL_TIMING_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {minutes !== null && (muscleMode === 'omakase' || (muscleMode === 'choose' && muscles.length > 0)) && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink-mid">
              {HEARING_COPY.stepCondition}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onConditionTap(c)}
                  className="h-14 rounded-card bg-line-ember/40 text-sm font-bold text-ink-mid active:bg-molten active:text-white"
                >
                  {CONDITION_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  // phase.kind === 'menu'
  const { ctx, menu, request } = phase
  const exerciseById = new Map(ctx.exercises.map((e) => [e.id!, e]))
  const menuExerciseIds = menu.items.map((i) => i.exerciseId)

  const updateItems = (items: MenuItem[]) => {
    setPhase({
      ...phase,
      menu: { ...menu, items, estimatedMinutes: estimatedMinutes(items) },
    })
  }

  const pickerCandidates: Exercise[] = picker
    ? picker.mode === 'swap'
      ? alternativesFor(
          ctx,
          exerciseById.get(menu.items[picker.itemIndex!].exerciseId)!.primaryMuscle,
          menuExerciseIds,
        )
      : menu.muscles.flatMap((m) => alternativesFor(ctx, m, menuExerciseIds))
    : []

  const onPick = (exercise: Exercise) => {
    if (!picker) return
    const newItem: MenuItem = { exerciseId: exercise.id!, ...prescriptionFor(exercise, ctx) }
    if (picker.mode === 'swap') {
      updateItems(menu.items.map((item, i) => (i === picker.itemIndex ? newItem : item)))
    } else {
      updateItems([...menu.items, newItem])
    }
    setPicker(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{MENU_COPY.title}</h1>
        <span className="text-sm text-ink-mid">{MENU_COPY.estimated(menu.estimatedMinutes)}</span>
      </div>

      <p className="text-xs text-ink-mid">{menu.rationale}</p>
      {!calibNoteShown && menu.items.length > 0 && (
        <p className="rounded-chip bg-line-ember/40 p-2 text-xs text-ink-mid">
          💡 {STRENGTH_COPY.calibrationNote}
        </p>
      )}
      {menu.warnings.map((w) => (
        <p key={w} className="rounded-chip bg-adjusting/10 p-2 text-xs text-adjusting">
          ⚠️ {w}
        </p>
      ))}

      {menu.items.length === 0 && (
        <p className="rounded-card border border-dashed border-line-ember p-6 text-sm text-ink-mid">
          {MENU_COPY.emptyMenu}
        </p>
      )}

      <ul className="space-y-2">
        {menu.items.map((item, index) => {
          const ex = exerciseById.get(item.exerciseId)!
          return (
            <li key={`${item.exerciseId}-${index}`} className="rounded-card bg-ember-tint border border-line-ember p-4">
              <div className="flex items-start justify-between gap-2">
                {/* 種目名タップで詳細シート(ISS-001) */}
                <button
                  type="button"
                  className="min-h-11 flex-1 text-left"
                  onClick={() => setDetailExercise(ex)}
                >
                  <p className="font-semibold">
                    {ex.name}
                    <span className="ml-1.5 text-xs text-ink-dim">ⓘ</span>
                    {item.isPrAttempt && (
                      <span className="ml-2 rounded bg-molten px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {MENU_COPY.prBadge}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-dim">
                    {MUSCLE_GROUP_LABELS[ex.primaryMuscle]}・{MOVEMENT_TYPE_LABELS[ex.movementType]}
                  </p>
                </button>
                <div className="text-right text-sm">
                  <p className="font-bold text-molten-bright">
                    {item.suggestedWeightKg !== undefined
                      ? MENU_COPY.weight(item.suggestedWeightKg)
                      : MENU_COPY.bodyweight}
                  </p>
                  <p className="text-xs text-ink-mid">
                    {MENU_COPY.setsReps(item.sets, item.suggestedReps)}
                  </p>
                  <p className="text-xs text-ink-dim">{MENU_COPY.interval(item.intervalSec)}</p>
                </div>
              </div>
              {item.isPrAttempt && <p className="mt-1 text-xs text-molten-bright">{MENU_COPY.prNote}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicker({ mode: 'swap', itemIndex: index })}
                  className="h-11 flex-1 rounded-chip bg-line-ember/40 text-xs text-ink-mid active:bg-line-ember"
                >
                  {MENU_COPY.swap}
                </button>
                <button
                  type="button"
                  onClick={() => updateItems(menu.items.filter((_, i) => i !== index))}
                  className="h-11 flex-1 rounded-chip bg-line-ember/40 text-xs text-ink-mid active:bg-line-ember"
                >
                  {MENU_COPY.remove}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => setPicker({ mode: 'add' })}
        className="h-12 w-full rounded-card border border-dashed border-line-ember text-sm text-ink-mid active:bg-line-ember/60"
      >
        + {MENU_COPY.addExercise}
      </button>

      <button
        type="button"
        disabled={menu.items.length === 0}
        onClick={async () => {
          const sleepHours = calcSleepHours(sleepStart, sleepEnd)
          await startSession(menu, request, ctx.dumbbellStepsKg, {
            sleepStart: sleepHours !== null ? sleepStart : undefined,
            sleepEnd: sleepHours !== null ? sleepEnd : undefined,
            sleepHours: sleepHours ?? undefined,
            mealTiming: mealTiming ?? undefined,
          })
          setCalibNoteShown(true)
          navigate('/workout/active')
        }}
        className="h-14 w-full rounded-card bg-molten font-bold text-white active:bg-molten-bright disabled:opacity-40"
      >
        {MENU_COPY.start}
      </button>
      <button
        type="button"
        onClick={resetHearing}
        className="h-12 w-full rounded-card bg-line-ember/40 text-sm text-ink-mid active:bg-line-ember"
      >
        {MENU_COPY.regenerate}
      </button>

      {detailExercise && (
        <ExerciseDetailSheet exercise={detailExercise} onClose={() => setDetailExercise(null)} />
      )}

      {picker && (
        <Modal
          title={picker.mode === 'swap' ? MENU_COPY.swapTitle : MENU_COPY.addTitle}
          onClose={() => setPicker(null)}
        >
          {pickerCandidates.length === 0 && (
            <p className="p-4 text-sm text-ink-mid">{MENU_COPY.noAlternatives}</p>
          )}
          <ul className="space-y-2">
            {pickerCandidates.map((ex) => {
              const p = prescriptionFor(ex, ctx)
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onPick(ex)}
                    className="flex h-14 w-full items-center justify-between rounded-card bg-line-ember/40 px-4 text-left active:bg-line-ember"
                  >
                    <span className="text-sm font-semibold">{ex.name}</span>
                    <span className="text-xs text-ink-mid">
                      {MUSCLE_GROUP_LABELS[ex.primaryMuscle]}・
                      {p.suggestedWeightKg !== undefined
                        ? MENU_COPY.weight(p.suggestedWeightKg)
                        : MENU_COPY.bodyweight}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Modal>
      )}
    </section>
  )
}
