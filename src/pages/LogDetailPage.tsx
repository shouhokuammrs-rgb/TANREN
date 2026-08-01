import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import {
  addLoggedSet,
  deleteLoggedSet,
  deleteSession,
  loadWorkout,
  updateLoggedSet,
  updateSessionNotes,
} from '../db/queries'
import type { SetRecord } from '../db/types'
import { autoCloudBackup } from '../utils/cloudBackup'

export default function LogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sessionId = Number(id)
  // undefined=読込中 / null=存在しない を区別する
  const workout = useLiveQuery(async () => (await loadWorkout(sessionId)) ?? null, [sessionId])
  const [editing, setEditing] = useState(false)
  // ログの事後編集(ISS-020): セット編集モード。?edit=1で編集状態で開く(サマリー直行導線)
  const [searchParams] = useSearchParams()
  const [editingSets, setEditingSets] = useState(searchParams.get('edit') === '1')

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
          <span className="text-xs text-ink-dim">
            {/* 編集済みの控えめな表示(ISS-020・updatedAtで判定) */}
            {session.updatedAt && (
              <span className="mr-2 text-[10px] text-ink-dim/70">{LOG_COPY.editedMark}</span>
            )}
            {SESSION_STATUS_LABELS[session.status]}
          </span>
        </div>
        {session.muscles && session.muscles.length > 0 && (
          <p className="mt-1 text-sm text-molten-bright">
            {session.muscles.map((m) => MUSCLE_GROUP_LABELS[m]).join('・')}
          </p>
        )}
      </div>

      {/* セット編集モード切替(ISS-020) */}
      {entries.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            className="h-11 rounded-chip border border-line-ember px-4 text-xs text-ink-mid active:border-molten active:text-molten"
            onClick={() => {
              if (editingSets) {
                // 編集を終えたタイミングでクラウドへ再アップロード(未ログイン時はno-op)
                void autoCloudBackup()
              }
              setEditingSets((v) => !v)
            }}
          >
            {editingSets ? LOG_COPY.editSetsDone : LOG_COPY.editSets}
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.sessionExercise.id} className="rounded-card bg-ember-tint border border-line-ember p-4">
            <p className="font-semibold">{entry.exercise.name}</p>
            <ul className="mt-2 space-y-1">
              {entry.sets.map((set) =>
                editingSets ? (
                  <SetEditorRow
                    key={set.id}
                    set={set}
                    exerciseName={entry.exercise.name}
                    isLastSet={entry.sets.length === 1}
                  />
                ) : (
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
                ),
              )}
            </ul>
            {editingSets && (
              <button
                type="button"
                className="mt-2 h-11 w-full rounded-chip bg-line-ember/40 text-xs text-ink-mid active:bg-line-ember"
                onClick={() => void addLoggedSet(entry.sessionExercise.id!)}
              >
                {LOG_COPY.addSet}
              </button>
            )}
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

/**
 * セット編集行(ISS-020): ±ステッパーで即時保存(Dexie liveQueryが再描画)。
 * weightは0.5kg刻み・repsは1刻み・下限は正の値。自重セットはrepsのみ。
 * 未実施セットは削除のみ可。最後の1セットの削除は種目記録ごと消えるため確認ダイアログ
 */
function SetEditorRow({
  set,
  exerciseName,
  isLastSet,
}: {
  set: SetRecord
  exerciseName: string
  isLastSet: boolean
}) {
  const onDelete = async () => {
    if (isLastSet && !window.confirm(LOG_COPY.deleteExerciseConfirm(exerciseName))) return
    await deleteLoggedSet(set.id!)
  }
  const step = (field: 'weight' | 'reps', dir: 1 | -1) => {
    if (set.completedAt === undefined || set.actualReps === undefined) return
    void updateLoggedSet(set.id!, {
      weightKg:
        field === 'weight' && set.actualWeightKg !== undefined
          ? set.actualWeightKg + dir * 0.5
          : set.actualWeightKg,
      reps: field === 'reps' ? set.actualReps + dir : set.actualReps,
    })
  }
  const stepButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-9 items-center justify-center"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-pill border border-line-ember text-sm text-ink-mid">
        {label.endsWith('+') ? '+' : '−'}
      </span>
    </button>
  )
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-ink-dim">{WORKOUT_COPY.setLabel(set.setNumber)}</span>
      <span className="flex items-center">
        {set.completedAt ? (
          <>
            {set.actualWeightKg !== undefined && (
              <>
                {stepButton(`セット${set.setNumber} 重量−`, () => step('weight', -1))}
                <span className="label-mono min-w-[52px] text-center text-sm font-bold tracking-normal text-ink">
                  {set.actualWeightKg}kg
                </span>
                {stepButton(`セット${set.setNumber} 重量+`, () => step('weight', 1))}
                <span className="mx-0.5 text-ink-dim">×</span>
              </>
            )}
            {stepButton(`セット${set.setNumber} レップ−`, () => step('reps', -1))}
            <span className="label-mono min-w-[30px] text-center text-sm font-bold tracking-normal text-ink">
              {set.actualReps}
            </span>
            {stepButton(`セット${set.setNumber} レップ+`, () => step('reps', 1))}
          </>
        ) : (
          <span className="text-xs text-ink-dim">{LOG_COPY.notDone}</span>
        )}
        <button
          type="button"
          aria-label={LOG_COPY.deleteSetLabel(set.setNumber)}
          onClick={() => void onDelete()}
          className="ml-1 flex h-11 w-9 items-center justify-center text-destructive"
        >
          ✕
        </button>
      </span>
    </li>
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
