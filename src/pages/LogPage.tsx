// ログ一覧+月カレンダー(ISS-026)。実施日はsessionsから導出(新規テーブルなし)。
// トレ実施日=鈍色ドット/今日=molten枠/選択日=塗り。日タップで当日サマリー+一覧へスクロール
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  LOG_COPY,
  MUSCLE_GROUP_LABELS,
  SESSION_STATUS_LABELS,
  formatDate,
} from '../constants/copy'
import { listSessionSummaries, type SessionSummary } from '../db/queries'
import { dayKey, monthGrid, shiftMonth, trainedDayKeys } from '../utils/calendar'
import { formatDurationJa } from '../utils/time'

export default function LogPage() {
  const summaries = useLiveQuery(listSessionSummaries)
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), monthIndex: today.getMonth() })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const trained = useMemo(
    () => trainedDayKeys((summaries ?? []).map((s) => s.session)),
    [summaries],
  )
  const grid = useMemo(() => monthGrid(view.year, view.monthIndex), [view])
  const todayKey = dayKey(today)
  const daySessions = useMemo(
    () =>
      selectedKey === null
        ? []
        : (summaries ?? []).filter((s) => dayKey(s.session.startedAt) === selectedKey),
    [summaries, selectedKey],
  )

  const selectDay = (date: Date) => {
    const key = dayKey(date)
    setSelectedKey(key)
    // 当日の最初のセッションへスクロール(ISS-026)
    const first = (summaries ?? []).find((s) => dayKey(s.session.startedAt) === key)
    if (first) {
      document
        .getElementById(`session-${first.session.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">{LOG_COPY.title}</h1>

      {/* 月カレンダー(ISS-026・自前グリッド) */}
      <div className="card-ember mt-4 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label={LOG_COPY.calendarPrev}
            onClick={() => {
              setView((v) => shiftMonth(v.year, v.monthIndex, -1))
              setSelectedKey(null)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-ink-mid active:text-molten"
          >
            ‹
          </button>
          <span className="label-mono text-[13px] font-bold tracking-normal text-ink">
            {LOG_COPY.calendarMonth(view.year, view.monthIndex + 1)}
          </span>
          <button
            type="button"
            aria-label={LOG_COPY.calendarNext}
            onClick={() => {
              setView((v) => shiftMonth(v.year, v.monthIndex, 1))
              setSelectedKey(null)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-ink-mid active:text-molten"
          >
            ›
          </button>
        </div>

        <div className="mt-1 grid grid-cols-7">
          {LOG_COPY.calendarWeekdays.map((w) => (
            <span key={w} className="label-mono py-1 text-center text-[9px] text-ink-dim">
              {w}
            </span>
          ))}
          {grid.map((cell) => {
            const key = dayKey(cell.date)
            const isToday = key === todayKey
            const isSelected = key === selectedKey
            const hasTraining = trained.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectDay(cell.date)}
                className={`flex h-10 flex-col items-center justify-center ${
                  cell.inMonth ? '' : 'opacity-30'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-pill text-xs tabular-nums ${
                    isSelected
                      ? 'bg-molten font-bold text-forge-black'
                      : isToday
                        ? 'border border-molten font-bold text-ink'
                        : 'text-ink-mid'
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {/* トレ実施日の鈍色ドット */}
                <span
                  className="mt-0.5 h-1 w-1 rounded-pill"
                  style={{ background: hasTraining ? '#8A5A3C' : 'transparent' }}
                />
              </button>
            )
          })}
        </div>

        {/* 選択日のサマリー(所要時間付き・タップで詳細へ) */}
        {daySessions.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-line-ember/40 pt-2">
            {daySessions.map((s) => (
              <li key={s.session.id}>
                <Link
                  to={`/log/${s.session.id}`}
                  className="flex h-11 items-center justify-between rounded-chip px-2 text-xs active:bg-line-ember/40"
                >
                  <span className="text-molten-bright">
                    {(s.session.muscles ?? []).map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
                  </span>
                  <span className="label-mono tracking-normal text-ink-mid">
                    {s.durationMinutes !== null && formatDurationJa(s.durationMinutes)}
                    <span className="ml-1.5 text-ink-dim">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summaries?.length === 0 && (
        <p className="mt-6 rounded-card border border-dashed border-line-ember p-6 text-sm text-ink-mid">
          {LOG_COPY.empty}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {summaries?.map(({ session, completionRate, durationMinutes }: SessionSummary) => (
          <li key={session.id} id={`session-${session.id}`}>
            <Link
              to={`/log/${session.id}`}
              className="block rounded-card bg-ember-tint border border-line-ember p-4 active:bg-line-ember/60"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{formatDate(session.startedAt)}</span>
                <span
                  className={`text-xs ${
                    session.status === 'aborted' ? 'text-adjusting' : 'text-ink-dim'
                  }`}
                >
                  {SESSION_STATUS_LABELS[session.status]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-mid">
                {session.muscles && session.muscles.length > 0 && (
                  <span className="text-molten-bright">
                    {session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
                  </span>
                )}
                {durationMinutes !== null && <span>{formatDurationJa(durationMinutes)}</span>}
                {completionRate !== null && <span>{LOG_COPY.completion(completionRate)}</span>}
                {session.rpe !== undefined && (
                  <span>
                    {LOG_COPY.rpeLabel} {session.rpe}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
