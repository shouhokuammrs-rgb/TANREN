// 成長マップの塗り(DEC-011)。成長ビュー(4a)とダッシュボードのミニ人体図(4b)で共用
import type { MusclePaint } from './BodySvg'
import { GROWTH_COLD, GROWTH_GLOW_FILTER, growthHeatOf } from '../constants/charts'
import type { MuscleGrowth } from '../engine'

/** 熱スケールの塗り(データ不足=冷えた鉄破線・選択中=hotストローク・維持=鋼色フラット) */
export function growthPaint(growth: MuscleGrowth, selected = false, maintain = false): MusclePaint {
  // 維持モード(5b §5): 熱スケールから外して鋼色にフラット置換。グローなし
  if (maintain) {
    return {
      // SVG属性にCSS変数は使えないためリテラル(= --color-steel)
      fill: '#C9B79C',
      ...(selected ? { stroke: '#FFE3CC', strokeWidth: 1.5 } : {}),
    }
  }
  if (!growth.hasEnoughData) {
    return {
      fill: GROWTH_COLD.fill,
      stroke: selected ? '#FFE3CC' : GROWTH_COLD.stroke,
      strokeWidth: 1.5,
      strokeDasharray: GROWTH_COLD.dash,
    }
  }
  const heat = growthHeatOf((growth.monthlyRate ?? 0) * 100)
  return {
    fill: heat.color,
    filter: heat.glow ? GROWTH_GLOW_FILTER : undefined,
    ...(selected ? { stroke: '#FFE3CC', strokeWidth: 1.5 } : {}),
  }
}
