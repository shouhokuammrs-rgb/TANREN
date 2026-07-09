import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import {
  CONDITION_LABELS,
  HEARING_COPY,
  MENU_COPY,
  MOVEMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  formatDate,
} from '../constants/copy'
import {
  abortSession,
  getActiveSession,
  loadEngineContext,
  loadLastHandoverNote,
  startSession,
} from '../db/queries'
import type { Condition, Exercise, MuscleGroup, Session } from '../db/types'
import {
  alternativesFor,
  estimatedMinutes,
  generateMenu,
  prescriptionFor,
} from '../engine'
import type { EngineContext, GeneratedMenu, MenuItem, MenuRequest } from '../engine/types'

const TIME_OPTIONS = [15, 30, 45, 60, 90]
const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[]

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

  useEffect(() => {
    void (async () => {
      const active = await getActiveSession()
      setHandover(await loadLastHandoverNote())
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
    return <p className="pt-10 text-center text-sm text-slate-500">…</p>
  }

  if (phase.kind === 'resume') {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">{HEARING_COPY.resumeTitle}</h1>
        <p className="text-sm text-slate-400">
          {HEARING_COPY.resumeBody(formatDate(phase.session.startedAt))}
        </p>
        <button
          type="button"
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
          onClick={() => navigate('/workout/active')}
        >
          {HEARING_COPY.resume}
        </button>
        <button
          type="button"
          className="h-12 w-full rounded-xl bg-slate-800 text-sm text-slate-300 active:bg-slate-700"
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
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold text-orange-400">
              {HEARING_COPY.handoverTitle}
            </p>
            {handover}
          </div>
        )}

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-400">{HEARING_COPY.stepTime}</h2>
          <div className="grid grid-cols-5 gap-2">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`h-14 rounded-xl text-sm font-bold ${
                  minutes === m ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
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
            <h2 className="mb-2 text-sm font-semibold text-slate-400">
              {HEARING_COPY.stepMuscles}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMuscleMode('omakase')
                  setMuscles([])
                }}
                className={`h-14 rounded-xl text-sm font-bold ${
                  muscleMode === 'omakase' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {HEARING_COPY.omakase}
              </button>
              <button
                type="button"
                onClick={() => setMuscleMode('choose')}
                className={`h-14 rounded-xl text-sm font-bold ${
                  muscleMode === 'choose' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
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
                    className={`h-12 rounded-xl text-sm font-bold ${
                      muscles.includes(m) ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {MUSCLE_GROUP_LABELS[m]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {minutes !== null && (muscleMode === 'omakase' || (muscleMode === 'choose' && muscles.length > 0)) && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-400">
              {HEARING_COPY.stepCondition}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onConditionTap(c)}
                  className="h-14 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 active:bg-orange-500 active:text-white"
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
        <span className="text-sm text-slate-400">{MENU_COPY.estimated(menu.estimatedMinutes)}</span>
      </div>

      <p className="text-xs text-slate-400">{menu.rationale}</p>
      {menu.warnings.map((w) => (
        <p key={w} className="rounded-lg bg-yellow-500/10 p-2 text-xs text-yellow-400">
          ⚠️ {w}
        </p>
      ))}

      {menu.items.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          {MENU_COPY.emptyMenu}
        </p>
      )}

      <ul className="space-y-2">
        {menu.items.map((item, index) => {
          const ex = exerciseById.get(item.exerciseId)!
          return (
            <li key={`${item.exerciseId}-${index}`} className="rounded-xl bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {ex.name}
                    {item.isPrAttempt && (
                      <span className="ml-2 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {MENU_COPY.prBadge}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {MUSCLE_GROUP_LABELS[ex.primaryMuscle]}・{MOVEMENT_TYPE_LABELS[ex.movementType]}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold text-orange-400">
                    {item.suggestedWeightKg !== undefined
                      ? MENU_COPY.weight(item.suggestedWeightKg)
                      : MENU_COPY.bodyweight}
                  </p>
                  <p className="text-xs text-slate-400">
                    {MENU_COPY.setsReps(item.sets, item.suggestedReps)}
                  </p>
                  <p className="text-xs text-slate-500">{MENU_COPY.interval(item.intervalSec)}</p>
                </div>
              </div>
              {item.isPrAttempt && <p className="mt-1 text-xs text-orange-400">{MENU_COPY.prNote}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicker({ mode: 'swap', itemIndex: index })}
                  className="h-11 flex-1 rounded-lg bg-slate-800 text-xs text-slate-300 active:bg-slate-700"
                >
                  {MENU_COPY.swap}
                </button>
                <button
                  type="button"
                  onClick={() => updateItems(menu.items.filter((_, i) => i !== index))}
                  className="h-11 flex-1 rounded-lg bg-slate-800 text-xs text-slate-300 active:bg-slate-700"
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
        className="h-12 w-full rounded-xl border border-dashed border-slate-600 text-sm text-slate-300 active:bg-slate-800"
      >
        + {MENU_COPY.addExercise}
      </button>

      <button
        type="button"
        disabled={menu.items.length === 0}
        onClick={async () => {
          await startSession(menu, request, ctx.dumbbellStepsKg)
          navigate('/workout/active')
        }}
        className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600 disabled:opacity-40"
      >
        {MENU_COPY.start}
      </button>
      <button
        type="button"
        onClick={resetHearing}
        className="h-12 w-full rounded-xl bg-slate-800 text-sm text-slate-300 active:bg-slate-700"
      >
        {MENU_COPY.regenerate}
      </button>

      {picker && (
        <Modal
          title={picker.mode === 'swap' ? MENU_COPY.swapTitle : MENU_COPY.addTitle}
          onClose={() => setPicker(null)}
        >
          {pickerCandidates.length === 0 && (
            <p className="p-4 text-sm text-slate-400">{MENU_COPY.noAlternatives}</p>
          )}
          <ul className="space-y-2">
            {pickerCandidates.map((ex) => {
              const p = prescriptionFor(ex, ctx)
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onPick(ex)}
                    className="flex h-14 w-full items-center justify-between rounded-xl bg-slate-800 px-4 text-left active:bg-slate-700"
                  >
                    <span className="text-sm font-semibold">{ex.name}</span>
                    <span className="text-xs text-slate-400">
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
