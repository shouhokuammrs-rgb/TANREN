import type { MuscleGroup } from '../db/types'

// ダッシュボード(2-4)のチャート配色。
// ダーク面で検証済みのカテゴリカルパレット(順序はCVD分離を最大化する固定順)。
// 部位→色の対応は固定で、フィルタ等で塗り替えない
export const MUSCLE_CHART_COLORS: Record<MuscleGroup, string> = {
  chest: '#3987e5', // blue
  back: '#199e70', // aqua
  shoulders: '#c98500', // yellow
  arms: '#008300', // green
  legs: '#9085e9', // violet
  abs: '#e66767', // red
  glutes: '#d55181', // magenta
}

/** チャートの推奨部位表示順(凡例・積み上げ順) */
export const MUSCLE_CHART_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'abs',
  'glutes',
]

/** フレッシュネスマップの状態バケット(閾値と色) */
export const FRESHNESS_BUCKETS = [
  { min: 80, color: '#199e70', label: '回復済み' },
  { min: 40, color: '#c98500', label: '回復中' },
  { min: 0, color: '#e66767', label: '休息推奨' },
] as const

export type FreshnessBucket = (typeof FRESHNESS_BUCKETS)[number]

/** %が属する状態バケット(人体図・部位チップ・警告文言で共通利用 / ISS-011) */
export function freshnessBucketOf(pct: number): FreshnessBucket {
  return FRESHNESS_BUCKETS.find((b) => pct >= b.min) ?? FRESHNESS_BUCKETS[FRESHNESS_BUCKETS.length - 1]
}

/** 人体図の未対象部位・輪郭色 */
export const BODY_NEUTRAL = '#241812'

// ===== 成長ビュー「熱の人体図」(DEC-011) =====

/** 変化率・推移を表示する最低セッション数(日単位)。未満は「冷えた鉄」表示 */
export const GROWTH_MIN_SESSIONS = 3

/** 成長ビューの表示期間(日) */
export const GROWTH_PERIODS = [30, 90] as const

/**
 * 熱の色スケール(DEC-011)。**月換算の伸び率(%)→色**の写像で、期間を切り替えても
 * 色の意味が変わらない。閾値はv1絶対値固定(growth_viz_concepts.mdの表)。
 * 適応スケーリング(経験レベル/伸び鈍化対応)は将来ISSで差し替え前提
 */
export const GROWTH_HEAT_SCALE = [
  { minMonthlyPct: 12, color: '#FFB300', glow: true, label: '白熱' },
  { minMonthlyPct: 9, color: '#FF5C1A', glow: true, label: '高熱' },
  { minMonthlyPct: 6, color: '#C2521C', glow: false, label: '熱' },
  { minMonthlyPct: 3, color: '#8A431C', glow: false, label: '温' },
  { minMonthlyPct: 0, color: '#5A2E14', glow: false, label: '微温' },
] as const

/** データ不足(冷えた鉄): 無彩色+破線枠 */
export const GROWTH_COLD = { fill: '#1C140E', stroke: '#3A2213', dash: '3 3' } as const

/** 月換算伸び率(%)→熱バケット。マイナス成長は0%側(微温)に丸める(下降の別色は導入しない) */
export function growthHeatOf(monthlyPct: number) {
  return (
    GROWTH_HEAT_SCALE.find((b) => monthlyPct >= b.minMonthlyPct) ??
    GROWTH_HEAT_SCALE[GROWTH_HEAT_SCALE.length - 1]
  )
}

/** 9%以上のグロー(モック指定) */
export const GROWTH_GLOW_FILTER = 'drop-shadow(0 0 6px rgba(255,92,26,.6))'

/** 回復予測スロット(4b): 成長=溶鉄と混同しない鈍色。moltenは回復表現に使わない */
export const RECOVERY_SLOT_COLORS = {
  bar: '#8A5A3C',
  recovered: '#6B5A4C',
} as const
