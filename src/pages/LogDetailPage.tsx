import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import {
  FINISH_COPY,
  LOG_COPY,
  MUSCLE_GROUP_LABELS,
  SESSION_STATUS_LABELS,
  WORKOUT_COPY,
  formatDate,
} from '../constants/copy'
import { loadWorkout, updateSessionNotes } from '../db/queries'

export default function LogDetailPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  // undefined=読込中 / null=存在しない を区別する
  const workout = useLiveQuery(async () => (await loadWorkout(sessionId)) ?? null, [sessionId])
  const [editing, setEditing] = useState(false)

  if (workout === undefined) {
    return <p className="pt-10 text-center text-sm text-slate-500">…</p>
  }
  if (workout === null || !workout.session.id) {
    return (
      <section className="space-y-4 pt-10 text-center">
        <p className="text-sm text-slate-400">{LOG_COPY.notFound}</p>
        <Link to="/log" className="text-sm text-orange-400">
          {LOG_COPY.backToList}
        </Link>
      </section>
    )
  }

  const { session, entries } = workout

  return (
    <section className="space-y-4">
      <div>
        <Link to="/log" className="text-xs text-slate-500">
          ← {LOG_COPY.backToList}
        </Link>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">{formatDate(session.startedAt)}</h1>
          <span className="text-xs text-slate-500">{SESSION_STATUS_LABELS[session.status]}</span>
        </div>
        {session.muscles && session.muscles.length > 0 && (
          <p className="mt-1 text-sm text-orange-400">
            {session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.sessionExercise.id} className="rounded-xl bg-slate-900 p-4">
            <p className="font-semibold">{entry.exercise.name}</p>
            <ul className="mt-2 space-y-1">
              {entry.sets.map((set) => (
                <li key={set.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{WORKOUT_COPY.setLabel(set.setNumber)}</span>
                  {set.completedAt ? (
                    <span>
                      {set.actualWeightKg !== undefined ? `${set.actualWeightKg}kg × ` : ''}
                      {set.actualReps}
                      {WORKOUT_COPY.repsUnit}
                      <span
                        className={`ml-2 text-xs ${set.achieved ? 'text-green-400' : 'text-yellow-400'}`}
                      >
                        {set.achieved ? LOG_COPY.achievedMark : LOG_COPY.missedMark}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">{LOG_COPY.notDone}</span>
                  )}
                </li>
              ))}
            </ul>
            {entry.sessionExercise.note && (
              <p className="mt-2 rounded-lg bg-slate-800/60 p-2 text-xs text-slate-400">
                {entry.sessionExercise.note}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-xl bg-slate-900 p-4 text-sm">
        {session.rpe !== undefined && (
          <p>
            <span className="text-slate-500">{LOG_COPY.rpeLabel}: </span>
            {session.rpe} / 10
          </p>
        )}
        {session.conditionNote && (
          <p>
            <span className="text-slate-500">{FINISH_COPY.conditionNote}: </span>
            {session.conditionNote}
          </p>
        )}
        {session.sessionNote && (
          <p>
            <span className="text-slate-500">{WORKOUT_COPY.sessionNotePlaceholder}: </span>
            {session.sessionNote}
          </p>
        )}
        {session.handoverNote && (
          <p>
            <span className="text-slate-500">{FINISH_COPY.handover}: </span>
            {session.handoverNote}
          </p>
        )}
        {!editing ? (
          <button
            type="button"
            className="h-11 w-full rounded-lg bg-slate-800 text-xs text-slate-300 active:bg-slate-700"
            onClick={() => setEditing(true)}
          >
            {LOG_COPY.editNotes}
          </button>
        ) : (
          <NotesEditor
            sessionId={session.id!}
            initial={{
              rpe: session.rpe,
              conditionNote: session.conditionNote ?? '',
              handoverNote: session.handoverNote ?? '',
            }}
            onDone={() => setEditing(false)}
          />
        )}
      </div>
    </section>
  )
}

interface NotesEditorProps {
  sessionId: number
  initial: { rpe?: number; conditionNote: string; handoverNote: string }
  onDone: () => void
}

/** F-06: 全項目は任意・後から追記可 */
function NotesEditor({ sessionId, initial, onDone }: NotesEditorProps) {
  const [rpe, setRpe] = useState(initial.rpe)
  const [conditionNote, setConditionNote] = useState(initial.conditionNote)
  const [handoverNote, setHandoverNote] = useState(initial.handoverNote)

  return (
    <div className="space-y-2 border-t border-slate-800 pt-2">
      <p className="text-xs font-semibold text-slate-400">{FINISH_COPY.rpe}</p>
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
      <textarea
        value={conditionNote}
        onChange={(e) => setConditionNote(e.target.value)}
        placeholder={FINISH_COPY.conditionNote}
        rows={2}
        className="w-full rounded-lg bg-slate-800 p-2 text-sm placeholder:text-slate-500"
      />
      <textarea
        value={handoverNote}
        onChange={(e) => setHandoverNote(e.target.value)}
        placeholder={FINISH_COPY.handover}
        rows={2}
        className="w-full rounded-lg bg-slate-800 p-2 text-sm placeholder:text-slate-500"
      />
      <button
        type="button"
        className="h-11 w-full rounded-lg bg-orange-500 text-sm font-bold text-white active:bg-orange-600"
        onClick={async () => {
          await updateSessionNotes(sessionId, {
            rpe,
            conditionNote: conditionNote || undefined,
            handoverNote: handoverNote || undefined,
          })
          onDone()
        }}
      >
        {LOG_COPY.saveNotes}
      </button>
    </div>
  )
}
