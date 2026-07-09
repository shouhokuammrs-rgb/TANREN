import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Modal from '../components/Modal'
import { db } from '../db/db'
import { addStrengthMark, deleteStrengthMark, resolveInjury, updateEquipment } from '../db/queries'
import type { Equipment } from '../db/types'
import {
  EQUIPMENT_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  SETTINGS_COPY,
  STRENGTH_COPY,
  formatDate,
} from '../constants/copy'
import { REF_LIFTS } from '../constants/strength'
import { epley1Rm } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'

function equipmentDetail(eq: Equipment): string | null {
  if (eq.type === 'dumbbell' && eq.weightStepsKg && eq.weightStepsKg.length > 0) {
    const steps = eq.weightStepsKg
    return SETTINGS_COPY.dumbbellSteps(steps[0], steps[steps.length - 1], steps.length)
  }
  if (eq.type === 'bench' && eq.minAngleDeg !== undefined && eq.maxAngleDeg !== undefined) {
    return SETTINGS_COPY.benchAngle(eq.minAngleDeg, eq.maxAngleDeg)
  }
  return null
}

export default function SettingsPage() {
  const equipment = useLiveQuery(() => db.equipment.toArray())
  const injuries = useLiveQuery(() => db.injuries.where('isActive').equals(1).toArray())
  const [autoTimer, setAutoTimer] = useLocalSetting('autoStartTimer', true)
  const [editing, setEditing] = useState<Equipment | null>(null)

  return (
    <section>
      <h1 className="text-2xl font-bold">{SETTINGS_COPY.title}</h1>

      <h2 className="mt-6 text-sm font-semibold text-slate-400">
        {SETTINGS_COPY.equipmentSection}
      </h2>
      <ul className="mt-2 space-y-2">
        {equipment?.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            {SETTINGS_COPY.equipmentEmpty}
          </li>
        )}
        {equipment?.map((eq) => {
          const detail = equipmentDetail(eq)
          const editable = eq.type === 'dumbbell' || eq.type === 'bench'
          return (
            <li key={eq.id} className="rounded-xl bg-slate-900 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {eq.name}
                  {eq.quantity > 1 && (
                    <span className="ml-1 text-sm text-slate-400">
                      {SETTINGS_COPY.equipmentCount(eq.quantity)}
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">
                  {EQUIPMENT_TYPE_LABELS[eq.type]}
                </span>
              </div>
              {detail && <p className="mt-1 text-sm text-slate-400">{detail}</p>}
              {editable && (
                <button
                  type="button"
                  className="mt-2 h-11 w-full rounded-lg bg-slate-800 text-xs text-slate-300 active:bg-slate-700"
                  onClick={() => setEditing(eq)}
                >
                  {SETTINGS_COPY.edit}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <StrengthSection />

      <h2 className="mt-6 text-sm font-semibold text-slate-400">{SETTINGS_COPY.timerSection}</h2>
      <label className="mt-2 flex h-14 items-center justify-between rounded-xl bg-slate-900 px-4">
        <span className="text-sm">{SETTINGS_COPY.timerAutoStart}</span>
        <input
          type="checkbox"
          checked={autoTimer}
          onChange={(e) => setAutoTimer(e.target.checked)}
          className="h-6 w-6 accent-orange-500"
        />
      </label>

      <h2 className="mt-6 text-sm font-semibold text-slate-400">
        {SETTINGS_COPY.injuriesSection}
      </h2>
      <ul className="mt-2 space-y-2">
        {(injuries === undefined || injuries.length === 0) && (
          <li className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            {SETTINGS_COPY.injuriesEmpty}
          </li>
        )}
        {injuries?.map((injury) => (
          <li
            key={injury.id}
            className="flex items-center justify-between rounded-xl bg-slate-900 p-4"
          >
            <div>
              <p className="text-sm font-semibold text-red-400">
                {MUSCLE_GROUP_LABELS[injury.bodyPart]}
              </p>
              <p className="text-xs text-slate-500">
                {SETTINGS_COPY.injuryReportedAt(formatDate(injury.reportedAt))}
                {injury.note ? `・${injury.note}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="h-11 rounded-lg bg-slate-800 px-4 text-xs text-slate-300 active:bg-slate-700"
              onClick={() => void resolveInjury(injury.id!)}
            >
              {SETTINGS_COPY.injuryResolve}
            </button>
          </li>
        ))}
      </ul>

      {editing?.type === 'dumbbell' && (
        <DumbbellWizard equipment={editing} onClose={() => setEditing(null)} />
      )}
      {editing?.type === 'bench' && (
        <BenchEditor equipment={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  )
}

/** 筋力の目安(ISS-002)。基準種目の実績から初期重量提案をキャリブレーションする */
function StrengthSection() {
  const marks = useLiveQuery(() => db.strength_marks.orderBy('recordedAt').reverse().toArray())
  const [adding, setAdding] = useState(false)
  const refById = new Map(REF_LIFTS.map((r) => [r.id, r]))

  return (
    <>
      <h2 className="mt-6 text-sm font-semibold text-slate-400">{STRENGTH_COPY.section}</h2>
      <p className="mt-1 text-xs text-slate-500">{STRENGTH_COPY.hint}</p>
      <ul className="mt-2 space-y-2">
        {marks?.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            {STRENGTH_COPY.empty}
          </li>
        )}
        {marks?.map((mark) => (
          <li
            key={mark.id}
            className="flex items-center justify-between rounded-xl bg-slate-900 p-4"
          >
            <div>
              <p className="text-sm font-semibold">
                {refById.get(mark.refLiftId)?.name ?? mark.refLiftId}
              </p>
              <p className="text-xs text-slate-400">
                {STRENGTH_COPY.mark(mark.weightKg, mark.reps)}・
                {STRENGTH_COPY.est1Rm(Math.round(epley1Rm(mark.weightKg, mark.reps) * 10) / 10)}
              </p>
            </div>
            <button
              type="button"
              className="h-11 rounded-lg bg-slate-800 px-4 text-xs text-slate-300 active:bg-slate-700"
              onClick={() => void deleteStrengthMark(mark.id!)}
            >
              {STRENGTH_COPY.delete}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 h-12 w-full rounded-xl border border-dashed border-slate-600 text-sm text-slate-300 active:bg-slate-800"
        onClick={() => setAdding(true)}
      >
        + {STRENGTH_COPY.add}
      </button>
      {adding && <StrengthMarkModal onClose={() => setAdding(false)} />}
    </>
  )
}

function StrengthMarkModal({ onClose }: { onClose: () => void }) {
  const [refLiftId, setRefLiftId] = useState(REF_LIFTS[0].id)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title={STRENGTH_COPY.addTitle} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">{STRENGTH_COPY.refLift}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {REF_LIFTS.map((lift) => (
              <button
                key={lift.id}
                type="button"
                onClick={() => setRefLiftId(lift.id)}
                className={`h-11 rounded-lg px-3 text-left text-sm font-semibold ${
                  refLiftId === lift.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {lift.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-400">
            {STRENGTH_COPY.weight}
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
            />
          </label>
          <label className="flex-1 text-xs text-slate-400">
            {STRENGTH_COPY.reps}
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
          onClick={async () => {
            const w = Number(weight)
            const r = Number(reps)
            if (!Number.isFinite(w) || w <= 0 || !Number.isInteger(r) || r <= 0 || r > 30) {
              setError(STRENGTH_COPY.invalid)
              return
            }
            await addStrengthMark({ refLiftId, weightKg: w, reps: r })
            onClose()
          }}
        >
          {STRENGTH_COPY.save}
        </button>
      </div>
    </Modal>
  )
}

/** 0.5kg単位に丸める */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * ダンベル編集ウィザード(1-2 / DEC-002差し替え):
 * 最小・最大・段階数の3問→等間隔配列を自動生成(0.5kg丸め)→タップで個別修正
 */
function DumbbellWizard({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const current = equipment.weightStepsKg ?? []
  const [minKg, setMinKg] = useState(String(current[0] ?? 2.5))
  const [maxKg, setMaxKg] = useState(String(current[current.length - 1] ?? 24))
  const [stepCount, setStepCount] = useState(String(current.length || 15))
  const [steps, setSteps] = useState<number[] | null>(current.length > 0 ? current : null)
  const [error, setError] = useState<string | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const generate = () => {
    const min = Number(minKg)
    const max = Number(maxKg)
    const count = Number(stepCount)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isInteger(count)) {
      setError(SETTINGS_COPY.invalidRange)
      return
    }
    const generated =
      count >= 2 && max > min
        ? Array.from({ length: count }, (_, i) => roundHalf(min + (i * (max - min)) / (count - 1)))
        : null
    if (!generated || new Set(generated).size !== count) {
      setError(SETTINGS_COPY.invalidRange)
      return
    }
    setError(null)
    setSteps(generated)
  }

  const numberInput = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="flex-1 text-xs text-slate-400">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
      />
    </label>
  )

  return (
    <Modal title={SETTINGS_COPY.dumbbellWizardTitle} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          {numberInput(minKg, setMinKg, SETTINGS_COPY.dumbbellMin)}
          {numberInput(maxKg, setMaxKg, SETTINGS_COPY.dumbbellMax)}
          {numberInput(stepCount, setStepCount, SETTINGS_COPY.dumbbellStepCount)}
        </div>
        <button
          type="button"
          onClick={generate}
          className="h-12 w-full rounded-xl bg-slate-700 text-sm font-semibold text-white active:bg-slate-600"
        >
          {SETTINGS_COPY.dumbbellGenerate}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {steps && (
          <div>
            <p className="mb-2 text-xs text-slate-400">{SETTINGS_COPY.dumbbellGenerated}</p>
            <div className="flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEditIndex(i)
                    setEditValue(String(s))
                  }}
                  className={`h-11 min-w-14 rounded-lg px-2 text-sm font-semibold tabular-nums ${
                    editIndex === i ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {editIndex !== null && (
              <div className="mt-3 flex items-end gap-2">
                {numberInput(
                  editValue,
                  setEditValue,
                  SETTINGS_COPY.dumbbellStepEditTitle(editIndex + 1),
                )}
                <button
                  type="button"
                  className="h-12 rounded-lg bg-slate-700 px-4 text-sm font-semibold text-white active:bg-slate-600"
                  onClick={() => {
                    const v = Number(editValue)
                    if (!Number.isFinite(v) || v <= 0) return
                    setSteps(steps.map((s, i) => (i === editIndex ? v : s)))
                    setEditIndex(null)
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!steps}
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600 disabled:opacity-40"
          onClick={async () => {
            if (!steps) return
            const sorted = [...steps].sort((a, b) => a - b)
            await updateEquipment(equipment.id!, { weightStepsKg: sorted })
            onClose()
          }}
        >
          {SETTINGS_COPY.save}
        </button>
      </div>
    </Modal>
  )
}

/** ベンチ角度範囲の編集(1-2) */
function BenchEditor({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const [minDeg, setMinDeg] = useState(String(equipment.minAngleDeg ?? -20))
  const [maxDeg, setMaxDeg] = useState(String(equipment.maxAngleDeg ?? 90))
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal title={SETTINGS_COPY.benchWizardTitle} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-400">
            {SETTINGS_COPY.benchMin}
            <input
              type="number"
              inputMode="numeric"
              value={minDeg}
              onChange={(e) => setMinDeg(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
            />
          </label>
          <label className="flex-1 text-xs text-slate-400">
            {SETTINGS_COPY.benchMax}
            <input
              type="number"
              inputMode="numeric"
              value={maxDeg}
              onChange={(e) => setMaxDeg(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600"
          onClick={async () => {
            const min = Number(minDeg)
            const max = Number(maxDeg)
            if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
              setError(SETTINGS_COPY.invalidRange)
              return
            }
            await updateEquipment(equipment.id!, { minAngleDeg: min, maxAngleDeg: max })
            onClose()
          }}
        >
          {SETTINGS_COPY.save}
        </button>
      </div>
    </Modal>
  )
}
