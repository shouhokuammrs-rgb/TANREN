// 人体図の共有ジオメトリ(DEC-011で回復マップと成長マップの共通部品化)。
// 塗り・枠・グローは呼び出し側がpaint(muscle)で決める(回復=鈍色バケット / 成長=熱スケール)
import { BODY_NEUTRAL } from '../constants/charts'
import type { MuscleGroup } from '../db/types'

export interface MusclePaint {
  fill: string
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  filter?: string
  opacity?: number
}

interface BodySvgProps {
  side: 'front' | 'back'
  paint: (muscle: MuscleGroup) => MusclePaint
  onPick?: (muscle: MuscleGroup) => void
  className?: string
}

export default function BodySvg({ side, paint, onPick, className }: BodySvgProps) {
  const p = (muscle: MuscleGroup) => {
    const { filter, ...attrs } = paint(muscle)
    return {
      ...attrs,
      style: filter ? { filter } : undefined,
      onClick: onPick ? () => onPick(muscle) : undefined,
      className: onPick ? 'cursor-pointer' : undefined,
    }
  }

  if (side === 'front') {
    // 前面: 肩・胸・腹・腕・脚
    return (
      <svg viewBox="0 0 100 190" className={className} aria-hidden="true">
        <circle cx="50" cy="14" r="10" fill={BODY_NEUTRAL} />
        <circle cx="30" cy="37" r="8" {...p('shoulders')} />
        <circle cx="70" cy="37" r="8" {...p('shoulders')} />
        <rect x="37" y="30" width="26" height="24" rx="5" {...p('chest')} />
        <rect x="40" y="56" width="20" height="26" rx="5" {...p('abs')} />
        <rect x="18" y="46" width="9" height="38" rx="4.5" {...p('arms')} />
        <rect x="73" y="46" width="9" height="38" rx="4.5" {...p('arms')} />
        <rect x="37" y="86" width="11" height="52" rx="5" {...p('legs')} />
        <rect x="52" y="86" width="11" height="52" rx="5" {...p('legs')} />
      </svg>
    )
  }
  // 背面: 背中・尻
  return (
    <svg viewBox="0 0 100 190" className={className} aria-hidden="true">
      <circle cx="50" cy="14" r="10" fill={BODY_NEUTRAL} />
      <rect x="37" y="30" width="26" height="36" rx="5" {...p('back')} />
      <rect x="18" y="46" width="9" height="38" rx="4.5" fill={BODY_NEUTRAL} />
      <rect x="73" y="46" width="9" height="38" rx="4.5" fill={BODY_NEUTRAL} />
      <ellipse cx="43" cy="75" rx="8.5" ry="8" {...p('glutes')} />
      <ellipse cx="57" cy="75" rx="8.5" ry="8" {...p('glutes')} />
      <rect x="37" y="88" width="11" height="50" rx="5" fill={BODY_NEUTRAL} />
      <rect x="52" y="88" width="11" height="50" rx="5" fill={BODY_NEUTRAL} />
    </svg>
  )
}
