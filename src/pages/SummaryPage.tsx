import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import {
  LOG_COPY,
  MUSCLE_GROUP_LABELS,
  SUMMARY_COPY,
  WORKOUT_COPY,
  formatDate,
} from '../constants/copy'
import { loadSessionSummaryView } from '../db/queries'
import type { PastSetInput } from '../engine'

function setLabel(set: PastSetInput): string {
  return set.weightKg !== undefined
    ? `${set.weightKg}kg × ${set.reps}${WORKOUT_COPY.repsUnit}`
    : `${set.reps}${WORKOUT_COPY.repsUnit}`
}

/** セッション後サマリー(仕様§5): 総ボリュームヒーロー+PR演出+種目リスト */
export default function SummaryPage() {
  const { id } = useParams()
  const view = useLiveQuery(async () => (await loadSessionSummaryView(Number(id))) ?? null, [id])

  if (view === undefined) {
    return <p className="pt-10 text-center text-sm text-ink-dim">…</p>
  }
  if (view === null) {
    return (
      <section className="space-y-4 pt-10 text-center">
        <p className="text-sm text-ink-mid">{LOG_COPY.notFound}</p>
        <Link to="/log" className="text-sm text-molten">
          {LOG_COPY.backToList}
        </Link>
      </section>
    )
  }

  const totalVolume = Math.round(view.exercises.reduce((sum, e) => sum + e.todayVolume, 0) * 10) / 10
  const duration =
    view.session.endedAt !== undefined
      ? Math.max(1, Math.round((view.session.endedAt.getTime() - view.session.startedAt.getTime()) / 60000))
      : null
  const weekly = Object.entries(view.weeklyMuscleSets) as [
    keyof typeof MUSCLE_GROUP_LABELS,
    number,
  ][]

  return (
    <section className="anim-rise space-y-5">
      {/* 見出し(§5) */}
      <header>
        <p className="label-mono text-[11px] text-ink-dim">
          {SUMMARY_COPY.caption(formatDate(view.session.startedAt), duration)}
        </p>
        <h1 className="mt-1 text-[26px] font-black text-ink">{SUMMARY_COPY.title}</h1>
      </header>

      {/* 総ボリューム(ヒーロー: Anton 84px+グロー) */}
      <div className="text-center">
        <p className="label-mono text-[11px] text-accent-dim">{SUMMARY_COPY.volumeLabel}</p>
        <p className="num-hero glow-text text-[84px] leading-none">
          {totalVolume.toLocaleString()}
          <span className="ml-2 text-lg text-accent-dim">{SUMMARY_COPY.volumeUnit}</span>
        </p>
      </div>

      {/* PR演出(§5・自己ベスト更新時のみ) */}
      {view.exercises
        .filter((ex) => ex.prSetNumbers.length > 0 && ex.todayBest)
        .map((ex) => (
          <PrCard key={ex.exerciseId} name={ex.exercise.name} best={ex.todayBest!} />
        ))}

      {/* 種目リスト(区切り line-soft) */}
      <ul className="card-ember divide-y divide-line-soft px-4">
        {view.exercises.map((ex) => {
          const volumeDiff =
            ex.prevVolume !== null ? Math.round((ex.todayVolume - ex.prevVolume) * 10) / 10 : null
          return (
            <li key={ex.exerciseId} className="py-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-ink">{ex.exercise.name}</p>
                <span className="label-mono text-[11px] tracking-normal text-ink-dim">
                  {MUSCLE_GROUP_LABELS[ex.exercise.primaryMuscle]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-mid">
                {ex.todayBest && (
                  <>
                    <span className="text-text-hot">{setLabel(ex.todayBest)}</span>
                    <span className="ml-2 text-ink-dim">
                      {ex.prevBest
                        ? SUMMARY_COPY.prevBest(setLabel(ex.prevBest))
                        : SUMMARY_COPY.firstTime}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-dim">
                {SUMMARY_COPY.volume}: {ex.todayVolume}
                {volumeDiff !== null && (
                  <span className={`ml-2 ${volumeDiff >= 0 ? 'text-achieved' : 'text-adjusting'}`}>
                    {SUMMARY_COPY.volumeDiff(volumeDiff)}
                  </span>
                )}
              </p>
            </li>
          )
        })}
      </ul>

      {weekly.length > 0 && (
        <div className="card-ember p-4">
          <p className="label-mono mb-2 text-[10px] text-accent-dim">{SUMMARY_COPY.weeklySection}</p>
          <div className="flex flex-wrap gap-2">
            {weekly.map(([muscle, sets]) => (
              <span
                key={muscle}
                className="rounded-chip border border-line-ember px-3 py-1.5 text-xs text-ink-mid"
              >
                {MUSCLE_GROUP_LABELS[muscle]}{' '}
                <span className="font-bold text-molten-bright">{sets}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to={`/log/${view.session.id}`}
          className="pill-ghost flex h-12 flex-1 items-center justify-center text-sm"
        >
          {SUMMARY_COPY.toLog}
        </Link>
        <Link
          to="/"
          className="pill-molten flex h-12 flex-1 items-center justify-center text-sm"
        >
          {SUMMARY_COPY.toHome}
        </Link>
      </div>
    </section>
  )
}

/**
 * PRカード(§5): 枠molten+強グロー、PRグラデ数字+heatShimmer、ヒートゲージ14セグメント。
 * heatShimmerはここ以外で使わない(§4)
 */
function PrCard({ name, best }: { name: string; best: PastSetInput }) {
  const SEGMENTS = 14
  const segmentColor = (i: number): string => {
    // 位置で gold → molten → deep-red
    if (i < SEGMENTS * 0.35) return '#FFB300'
    if (i < SEGMENTS * 0.75) return '#FF5C1A'
    return '#D8321A'
  }
  return (
    <div
      className="rounded-card border border-molten p-4"
      style={{ boxShadow: '0 0 40px rgba(255,92,26,.15)' }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-bold text-ink">{SUMMARY_COPY.prTitle(name)}</p>
        <span className="label-mono text-[12px] font-bold tracking-normal text-gold">
          {SUMMARY_COPY.prBadge}
        </span>
      </div>
      <p className="num-hero pr-gradient-text anim-shimmer mt-1 whitespace-nowrap text-[52px] leading-none">
        {best.weightKg !== undefined ? `${best.weightKg}` : `${best.reps}`}
        {best.weightKg !== undefined && (
          <>
            <span className="text-[26px]">kg</span>
            <span className="mx-1 text-[32px]">×</span>
            {best.reps}
          </>
        )}
        <span className="ml-1 text-[22px]">{WORKOUT_COPY.repsUnit}</span>
      </p>
      {/* ヒートゲージ */}
      <div className="mt-3 flex gap-1">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[2px]"
            style={{
              background: segmentColor(i),
              boxShadow: '0 0 8px rgba(255,92,26,.4)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
