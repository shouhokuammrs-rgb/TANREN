import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  LOG_COPY,
  MUSCLE_GROUP_LABELS,
  SESSION_STATUS_LABELS,
  formatDate,
} from '../constants/copy'
import { listSessionSummaries } from '../db/queries'

export default function LogPage() {
  const summaries = useLiveQuery(listSessionSummaries)

  return (
    <section>
      <h1 className="text-2xl font-bold">{LOG_COPY.title}</h1>

      {summaries?.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
          {LOG_COPY.empty}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {summaries?.map(({ session, completionRate, durationMinutes }) => (
          <li key={session.id}>
            <Link
              to={`/log/${session.id}`}
              className="block rounded-xl bg-slate-900 p-4 active:bg-slate-800"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{formatDate(session.startedAt)}</span>
                <span
                  className={`text-xs ${
                    session.status === 'aborted' ? 'text-yellow-400' : 'text-slate-500'
                  }`}
                >
                  {SESSION_STATUS_LABELS[session.status]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {session.muscles && session.muscles.length > 0 && (
                  <span className="text-orange-400">
                    {session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
                  </span>
                )}
                {durationMinutes !== null && <span>{LOG_COPY.duration(durationMinutes)}</span>}
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
