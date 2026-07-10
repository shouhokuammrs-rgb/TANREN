import { BODY_NEUTRAL, FRESHNESS_BUCKETS } from '../constants/charts'
import { DASHBOARD_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { MuscleGroup } from '../db/types'

// 簡易人体図SVG(2-4)。見た目はPhase 4で磨く前提の機能優先版

function colorFor(freshness: number): string {
  const bucket = FRESHNESS_BUCKETS.find((b) => freshness >= b.min)
  return bucket ? bucket.color : BODY_NEUTRAL
}

interface FreshnessBodyMapProps {
  freshness: Record<MuscleGroup, number>
}

export default function FreshnessBodyMap({ freshness }: FreshnessBodyMapProps) {
  const f = (m: MuscleGroup) => ({ fill: colorFor(freshness[m]), opacity: 0.9 })

  return (
    <div>
      <div className="flex items-start justify-center gap-6">
        {/* 前面: 肩・胸・腹・腕・脚 */}
        <figure className="text-center">
          <svg viewBox="0 0 100 190" className="h-44 w-auto" aria-hidden="true">
            <circle cx="50" cy="14" r="10" fill={BODY_NEUTRAL} />
            <circle cx="30" cy="37" r="8" {...f('shoulders')} />
            <circle cx="70" cy="37" r="8" {...f('shoulders')} />
            <rect x="37" y="30" width="26" height="24" rx="5" {...f('chest')} />
            <rect x="40" y="56" width="20" height="26" rx="5" {...f('abs')} />
            <rect x="18" y="46" width="9" height="38" rx="4.5" {...f('arms')} />
            <rect x="73" y="46" width="9" height="38" rx="4.5" {...f('arms')} />
            <rect x="37" y="86" width="11" height="52" rx="5" {...f('legs')} />
            <rect x="52" y="86" width="11" height="52" rx="5" {...f('legs')} />
          </svg>
          <figcaption className="mt-1 text-[10px] text-ink-dim">
            {DASHBOARD_COPY.freshnessFront}
          </figcaption>
        </figure>
        {/* 背面: 背中・尻 */}
        <figure className="text-center">
          <svg viewBox="0 0 100 190" className="h-44 w-auto" aria-hidden="true">
            <circle cx="50" cy="14" r="10" fill={BODY_NEUTRAL} />
            <rect x="37" y="30" width="26" height="36" rx="5" {...f('back')} />
            <rect x="18" y="46" width="9" height="38" rx="4.5" fill={BODY_NEUTRAL} />
            <rect x="73" y="46" width="9" height="38" rx="4.5" fill={BODY_NEUTRAL} />
            <ellipse cx="43" cy="75" rx="8.5" ry="8" {...f('glutes')} />
            <ellipse cx="57" cy="75" rx="8.5" ry="8" {...f('glutes')} />
            <rect x="37" y="88" width="11" height="50" rx="5" fill={BODY_NEUTRAL} />
            <rect x="52" y="88" width="11" height="50" rx="5" fill={BODY_NEUTRAL} />
          </svg>
          <figcaption className="mt-1 text-[10px] text-ink-dim">
            {DASHBOARD_COPY.freshnessBack}
          </figcaption>
        </figure>
      </div>

      {/* 部位別%(色だけに頼らない二次表示) */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map((m) => (
          <div key={m} className="rounded-chip bg-line-ember/40 py-1.5">
            <p className="text-[10px] text-ink-mid">{MUSCLE_GROUP_LABELS[m]}</p>
            <p className="text-xs font-bold" style={{ color: colorFor(freshness[m]) }}>
              {freshness[m]}%
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-3">
        {FRESHNESS_BUCKETS.map((b) => (
          <span key={b.label} className="flex items-center gap-1 text-[10px] text-ink-mid">
            <span className="h-2.5 w-2.5 rounded-pill" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}
