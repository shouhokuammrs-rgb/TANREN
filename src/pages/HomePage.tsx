import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { HOME_COPY, LOG_COPY, MUSCLE_GROUP_LABELS, formatDate } from '../constants/copy'
import { listSessionSummaries } from '../db/queries'

export default function HomePage() {
  const summaries = useLiveQuery(listSessionSummaries)
  const last = summaries?.[0]

  return (
    <section>
      <h1 className="text-2xl font-bold">{HOME_COPY.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{HOME_COPY.subtitle}</p>

      <Link
        to="/workout"
        className="mt-6 flex h-16 w-full items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white active:bg-orange-600"
      >
        {HOME_COPY.startCta} 💪
      </Link>

      <div className="mt-6 rounded-xl bg-slate-900 p-4 text-sm">
        {last ? (
          <Link to={`/log/${last.session.id}`} className="block">
            <p className="text-xs text-slate-500">{HOME_COPY.lastSession(formatDate(last.session.startedAt))}</p>
            <p className="mt-1">
              {last.session.muscles && last.session.muscles.length > 0 && (
                <span className="mr-2 text-orange-400">
                  {last.session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
                </span>
              )}
              {last.durationMinutes !== null && (
                <span className="mr-2 text-slate-400">{LOG_COPY.duration(last.durationMinutes)}</span>
              )}
              {last.completionRate !== null && (
                <span className="text-slate-400">{LOG_COPY.completion(last.completionRate)}</span>
              )}
            </p>
          </Link>
        ) : (
          <p className="text-slate-400">{HOME_COPY.noSession}</p>
        )}
      </div>
    </section>
  )
}
