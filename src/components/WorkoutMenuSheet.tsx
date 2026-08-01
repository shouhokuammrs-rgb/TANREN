// 実行画面のメニュー一覧シート(ISS-021)。参照のみ(種目ジャンプ・順序入替はスコープ外)。
// シート表示中もタイマー(RESTING)は親のtickが回り続けるため停止しない
import { MENU_COPY, WORKOUT_COPY } from '../constants/copy'
import type { WorkoutEntry } from '../db/queries'
import { entryStatuses } from '../utils/workoutMenu'
import Modal from './Modal'

export default function WorkoutMenuSheet({
  entries,
  onClose,
}: {
  entries: WorkoutEntry[]
  onClose: () => void
}) {
  const statuses = entryStatuses(entries)
  return (
    <Modal title={MENU_COPY.title} onClose={onClose}>
      <ul className="divide-y divide-line-soft">
        {entries.map((entry, i) => {
          const status = statuses[i]
          const doneCount = entry.sets.filter((s) => s.completedAt !== undefined).length
          // 目標表示は現在(=最初の未完了)セット基準。全完了時は先頭セット
          const rep = entry.sets.find((s) => s.completedAt === undefined) ?? entry.sets[0]
          return (
            <li
              key={entry.sessionExercise.id}
              className={`flex items-center justify-between gap-2 py-3 ${
                status === 'pending' ? 'opacity-50' : ''
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-bold ${
                    status === 'active' ? 'text-molten-bright' : 'text-ink'
                  }`}
                >
                  {entry.exercise.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  {MENU_COPY.setsReps(entry.sets.length, rep?.suggestedReps ?? rep?.actualReps ?? 0)}
                  {' ・ '}
                  {rep?.suggestedWeightKg !== undefined
                    ? MENU_COPY.weight(rep.suggestedWeightKg)
                    : MENU_COPY.bodyweight}
                  {' ・ '}
                  {WORKOUT_COPY.menuSetsProgress(doneCount, entry.sets.length)}
                </p>
              </div>
              <span
                className={`label-mono shrink-0 rounded-chip px-2.5 py-1.5 text-[11px] font-bold tracking-normal ${
                  status === 'done'
                    ? 'text-achieved'
                    : status === 'active'
                      ? 'bg-ember-tint text-molten-bright'
                      : 'text-ink-dim'
                }`}
              >
                {status === 'done'
                  ? WORKOUT_COPY.menuStatusDone
                  : status === 'active'
                    ? WORKOUT_COPY.menuStatusActive
                    : WORKOUT_COPY.menuStatusPending}
              </span>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
