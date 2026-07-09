import Modal from './Modal'
import Pictogram from './Pictogram'
import {
  DETAIL_COPY,
  EQUIPMENT_TYPE_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
} from '../constants/copy'
import type { Exercise } from '../db/types'

interface ExerciseDetailSheetProps {
  exercise: Exercise
  onClose: () => void
}

/** 種目詳細シート(ISS-001)。トレ中に片手で読める簡潔さ優先 */
export default function ExerciseDetailSheet({ exercise, onClose }: ExerciseDetailSheetProps) {
  const secondary = exercise.muscleGroups.filter((m) => m !== exercise.primaryMuscle)
  return (
    <Modal title={exercise.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 text-orange-400">
            <Pictogram pattern={exercise.movementPattern} />
          </div>
          <div className="text-xs text-slate-400">
            <p>
              {MOVEMENT_PATTERN_LABELS[exercise.movementPattern]}・
              {MOVEMENT_TYPE_LABELS[exercise.movementType]}
            </p>
            <p className="mt-0.5">
              {exercise.requiredEquipment.map((e) => EQUIPMENT_TYPE_LABELS[e]).join('+')}
              {exercise.benchAngleDeg !== undefined && (
                <span className="ml-2 text-orange-400">
                  {DETAIL_COPY.benchAngle(exercise.benchAngleDeg)}
                </span>
              )}
            </p>
            <p className="mt-0.5">{DETAIL_COPY.repRange(exercise.repRangeMin, exercise.repRangeMax)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-orange-500 px-2.5 py-1 font-bold text-white">
            {DETAIL_COPY.primary}: {MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}
          </span>
          {secondary.map((m) => (
            <span key={m} className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
              {DETAIL_COPY.secondary}: {MUSCLE_GROUP_LABELS[m]}
            </span>
          ))}
        </div>

        {exercise.note && <p className="text-xs text-slate-400">{exercise.note}</p>}

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">{DETAIL_COPY.cues}</p>
          <ul className="space-y-1.5">
            {exercise.formCues.map((cue) => (
              <li key={cue} className="flex gap-2 rounded-lg bg-slate-800/60 p-2 text-sm">
                <span className="text-orange-400">✓</span>
                {cue}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">{DETAIL_COPY.mistake}</p>
          <p className="flex gap-2 rounded-lg bg-red-500/10 p-2 text-sm text-red-300">
            <span>⚠️</span>
            {exercise.commonMistake}
          </p>
        </div>
      </div>
    </Modal>
  )
}
