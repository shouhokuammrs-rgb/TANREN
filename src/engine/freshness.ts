// 回復モデル(要件F-04-1)の雛形。UI非依存の純関数のみ置く。
// Phase 1でボリューム(直近セッションのセット数×強度)による補正を追加する。

/**
 * 筋フレッシュネス(0-100%)を算出する。
 * 最終刺激からの経過時間が基準回復時間に達すると100%になる線形モデル。
 *
 * @param elapsedHours 対象部位への最終刺激からの経過時間(時間)。未トレ部位はInfinityを渡す
 * @param recoveryHours 基準回復時間(時間)。大筋群72h / 小筋群48h(constants/recovery.ts)
 */
export function calcFreshness(elapsedHours: number, recoveryHours: number): number {
  if (recoveryHours <= 0) {
    throw new Error(`recoveryHours must be positive: ${recoveryHours}`)
  }
  if (elapsedHours < 0) {
    throw new Error(`elapsedHours must be non-negative: ${elapsedHours}`)
  }
  const ratio = elapsedHours / recoveryHours
  return Math.min(100, Math.round(ratio * 100))
}
