import BodySvg from './BodySvg'
import { FRESHNESS_BUCKETS, freshnessBucketOf } from '../constants/charts'
import { DASHBOARD_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import type { MuscleGroup } from '../db/types'

// 回復状況の人体図(2-4)。ジオメトリはBodySvgに共通化(DEC-011)

function colorFor(freshness: number): string {
  return freshnessBucketOf(freshness).color
}

interface FreshnessBodyMapProps {
  freshness: Record<MuscleGroup, number>
}

export default function FreshnessBodyMap({ freshness }: FreshnessBodyMapProps) {
  const paint = (m: MuscleGroup) => ({ fill: colorFor(freshness[m]), opacity: 0.9 })

  return (
    <div>
      <div className="flex items-start justify-center gap-6">
        <figure className="text-center">
          <BodySvg side="front" paint={paint} className="h-44 w-auto" />
          <figcaption className="mt-1 text-[10px] text-ink-dim">
            {DASHBOARD_COPY.freshnessFront}
          </figcaption>
        </figure>
        <figure className="text-center">
          <BodySvg side="back" paint={paint} className="h-44 w-auto" />
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
