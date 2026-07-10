import type { MuscleGroup } from '../db/types'

// ダッシュボード(2-4)のチャート配色。
// ダーク面(#0f172a)で検証済みのカテゴリカルパレット(順序はCVD分離を最大化する固定順)。
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

/** 人体図の未対象部位・輪郭色 */
export const BODY_NEUTRAL = '#1e293b'
