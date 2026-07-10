import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import {
  LOG_COPY,
  MUSCLE_GROUP_LABELS,
  SUMMARY_COPY,
  WORKOUT_COPY,
} from '../constants/copy'
import { loadSessionSummaryView } from '../db/queries'
import type { PastSetInput } from '../engine'

function setLabel(set: PastSetInput): string {
  return set.weightKg !== undefined
    ? `${set.weightKg}kg × ${set.reps}${WORKOUT_COPY.repsUnit}`
    : `${set.reps}${WORKOUT_COPY.repsUnit}`
}

/** セッション後サマリー(F-07): 前回比・PR・今週の部位別セット数 */
export default function SummaryPage() {
  const { id } = useParams()
  const view = useLiveQuery(
    async () => (await loadSessionSummaryView(Number(id))) ?? null,
    [id],
  )

  if (view === undefined) {
    return <p className="pt-10 text-center text-sm text-slate-500">…</p>
  }
  if (view === null) {
    return (
      <section className="space-y-4 pt-10 text-center">
        <p className="text-sm text-slate-400">{LOG_COPY.notFound}</p>
        <Link to="/log" className="text-sm text-orange-400">
          {LOG_COPY.backToList}
        </Link>
      </section>
    )
  }

  const weekly = Object.entries(view.weeklyMuscleSets) as [
    keyof typeof MUSCLE_GROUP_LABELS,
    number,
  ][]

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{SUMMARY_COPY.title}</h1>
      {view.prCount > 0 && (
        <p className="rounded-xl bg-orange-500/15 p-3 text-center text-lg font-bold text-orange-400">
          {SUMMARY_COPY.prCelebration(view.prCount)}
        </p>
      )}

      <ul className="space-y-2">
        {view.exercises.map((ex) => {
          const volumeDiff =
            ex.prevVolume !== null ? Math.round((ex.todayVolume - ex.prevVolume) * 10) / 10 : null
          return (
            <li key={ex.exerciseId} className="rounded-xl bg-slate-900 p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">
                  {ex.exercise.name}
                  {ex.prSetNumbers.length > 0 && (
                    <span className="ml-2 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {SUMMARY_COPY.prBadge} × {ex.prSetNumbers.length}
                    </span>
                  )}
                </p>
                <span className="text-xs text-slate-500">
                  {MUSCLE_GROUP_LABELS[ex.exercise.primaryMuscle]}
                </span>
              </div>
              <div className="mt-1 space-y-0.5 text-sm">
                {ex.todayBest && (
                  <p>
                    <span className="text-slate-500">{SUMMARY_COPY.best}: </span>
                    <span className="font-semibold text-orange-400">{setLabel(ex.todayBest)}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {ex.prevBest ? SUMMARY_COPY.prevBest(setLabel(ex.prevBest)) : SUMMARY_COPY.firstTime}
                    </span>
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {SUMMARY_COPY.volume}: {ex.todayVolume}
                  {volumeDiff !== null && (
                    <span className={`ml-2 ${volumeDiff >= 0 ? 'text-green-400' : 'text-yellow-300'}`}>
                      {SUMMARY_COPY.volumeDiff(volumeDiff)}
                    </span>
                  )}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      {weekly.length > 0 && (
        <div className="rounded-xl bg-slate-900 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-400">{SUMMARY_COPY.weeklySection}</p>
          <div className="flex flex-wrap gap-2">
            {weekly.map(([muscle, sets]) => (
              <span key={muscle} className="rounded-full bg-slate-800 px-3 py-1.5 text-xs">
                {MUSCLE_GROUP_LABELS[muscle]}{' '}
                <span className="font-bold text-orange-400">{sets}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to={`/log/${view.session.id}`}
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-slate-800 text-sm font-semibold text-slate-200 active:bg-slate-700"
        >
          {SUMMARY_COPY.toLog}
        </Link>
        <Link
          to="/"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white active:bg-orange-600"
        >
          {SUMMARY_COPY.toHome}
        </Link>
      </div>
    </section>
  )
}
