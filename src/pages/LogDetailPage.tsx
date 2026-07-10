import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FINISH_COPY,
  HEARING_COPY,
  LOG_COPY,
  MEAL_TIMING_LABELS,
  MUSCLE_GROUP_LABELS,
  SESSION_STATUS_LABELS,
  WORKOUT_COPY,
  formatDate,
} from '../constants/copy'
import { deleteSession, loadWorkout, updateSessionNotes } from '../db/queries'

export default function LogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sessionId = Number(id)
  // undefined=読込中 / null=存在しない を区別する
  const workout = useLiveQuery(async () => (await loadWorkout(sessionId)) ?? null, [sessionId])
  const [editing, setEditing] = useState(false)

  if (workout === undefined) {
    return <p className="pt-10 text-center text-sm text-ink-dim">…</p>
  }
  if (workout === null || !workout.session.id) {
    return (
      <section className="space-y-4 pt-10 text-center">
        <p className="text-sm text-ink-mid">{LOG_COPY.notFound}</p>
        <Link to="/log" className="text-sm text-molten-bright">
          {LOG_COPY.backToList}
        </Link>
      </section>
    )
  }

  const { session, entries } = workout

  return (
    <section className="space-y-4">
      <div>
        <Link to="/log" className="text-xs text-ink-dim">
          ← {LOG_COPY.backToList}
        </Link>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">{formatDate(session.startedAt)}</h1>
          <span className="text-xs text-ink-dim">{SESSION_STATUS_LABELS[session.status]}</span>
        </div>
        {session.muscles && session.muscles.length > 0 && (
          <p className="mt-1 text-sm text-molten-bright">
            {session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.sessionExercise.id} className="rounded-card bg-ember-tint border border-line-ember p-4">
            <p className="font-semibold">{entry.exercise.name}</p>
            <ul className="mt-2 space-y-1">
              {entry.sets.map((set) => (
                <li key={set.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-dim">{WORKOUT_COPY.setLabel(set.setNumber)}</span>
                  {set.completedAt ? (
                    <span>
                      {set.actualWeightKg !== undefined ? `${set.actualWeightKg}kg × ` : ''}
                      {set.actualReps}
                      {WORKOUT_COPY.repsUnit}
                      {set.isPr && (
                        <span className="ml-1.5 rounded bg-molten px-1.5 py-0.5 text-[10px] font-bold text-white">
                          PR
                        </span>
                      )}
                      <span
                        className={`ml-2 text-xs ${set.achieved ? 'text-achieved' : 'text-adjusting'}`}
                      >
                        {set.achieved ? LOG_COPY.achievedMark : LOG_COPY.missedMark}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-dim">{LOG_COPY.notDone}</span>
                  )}
                </li>
              ))}
            </ul>
            {entry.sessionExercise.note && (
              <p className="mt-2 rounded-chip bg-line-ember/40 p-2 text-xs text-ink-mid">
                {entry.sessionExercise.note}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-card bg-ember-tint border border-line-ember p-4 text-sm">
        {session.sleepStart && session.sleepEnd && session.sleepHours !== undefined && (
          <p className="text-ink-mid">
            🌙 {LOG_COPY.sleepLine(session.sleepStart, session.sleepEnd, session.sleepHours)}
          </p>
        )}
        {session.mealTiming && (
          <p className="text-ink-mid">
            🍚 {HEARING_COPY.mealLabel}: {MEAL_TIMING_LABELS[session.mealTiming]}
          </p>
        )}
        {session.rpe !== undefined && (
          <p>
            <span className="text-ink-dim">{LOG_COPY.rpeLabel}: </span>
            {session.rpe} / 10
          </p>
        )}
        {session.conditionNote && (
          <p>
            <span className="text-ink-dim">{FINISH_COPY.conditionNote}: </span>
            {session.conditionNote}
          </p>
        )}
        {session.sessionNote && (
          <p>
            <span className="text-ink-dim">{WORKOUT_COPY.sessionNotePlaceholder}: </span>
            {session.sessionNote}
          </p>
        )}
        {session.handoverNote && (
          <p>
            <span className="text-ink-dim">{FINISH_COPY.handover}: </span>
            {session.handoverNote}
          </p>
        )}
        {!editing ? (
          <button
            type="button"
            className="h-11 w-full rounded-chip bg-line-ember/40 text-xs text-ink-mid active:bg-line-ember"
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

      {/* ISS-008: 削除(ボタン→確認ダイアログの二段確認) */}
      <button
        type="button"
        className="h-12 w-full rounded-card border border-destructive/40 text-sm font-semibold text-destructive active:bg-destructive/10"
        onClick={async () => {
          if (window.confirm(LOG_COPY.deleteConfirm)) {
            await deleteSession(session.id!)
            navigate('/log', { replace: true })
          }
        }}
      >
        {LOG_COPY.deleteSession}
      </button>
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
    <div className="space-y-2 border-t border-line-ember pt-2">
      <p className="text-xs font-semibold text-ink-mid">{FINISH_COPY.rpe}</p>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRpe(rpe === n ? undefined : n)}
            className={`h-11 rounded-chip text-sm font-bold ${
              rpe === n ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
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
        className="w-full rounded-chip bg-line-ember/40 p-2 text-sm placeholder:text-ink-dim"
      />
      <textarea
        value={handoverNote}
        onChange={(e) => setHandoverNote(e.target.value)}
        placeholder={FINISH_COPY.handover}
        rows={2}
        className="w-full rounded-chip bg-line-ember/40 p-2 text-sm placeholder:text-ink-dim"
      />
      <button
        type="button"
        className="h-11 w-full rounded-chip bg-molten text-sm font-bold text-white active:bg-molten-bright"
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
