import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Equipment } from '../db/types'
import { EQUIPMENT_TYPE_LABELS, SETTINGS_COPY } from '../constants/copy'

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
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">{SETTINGS_COPY.seedNote}</p>
    </section>
  )
}
