// 回復モデル(要件F-04-1)。UI非依存の純関数のみ置く。

import { VOLUME_RECOVERY_FACTORS } from '../constants/engine'
import { MUSCLE_SIZE, recoveryHoursFor } from '../constants/recovery'
import type { MuscleGroup } from '../db/types'
import type { EngineContext, EngineTuning } from './types'

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

/**
 * 直近セッションのボリューム(完了セット数)で基準回復時間を補正する(F-04-1「経過時間×ボリューム」)。
 * 基準回復時間は上級者設定(DEC-010)の大/小筋群オーバーライドを反映する
 */
export function effectiveRecoveryHours(
  muscle: MuscleGroup,
  lastSetCount: number,
  tuning?: EngineTuning,
): number {
  const override =
    MUSCLE_SIZE[muscle] === 'large' ? tuning?.largeRecoveryHours : tuning?.smallRecoveryHours
  const entry = VOLUME_RECOVERY_FACTORS.find((f) => lastSetCount <= f.maxSets)
  const factor = entry ? entry.factor : 1
  return (override ?? recoveryHoursFor(muscle)) * factor
}

/** 100%到達までの残り時間(h)。線形回復モデルの逆算(DEC-010 §3-1 回復予測) */
export function hoursUntilRecovered(freshness: number, effectiveRecoveryHours: number): number {
  return Math.max(0, ((100 - freshness) / 100) * effectiveRecoveryHours)
}

/** 全部位のフレッシュネス(0-100%)を算出する。刺激履歴のない部位は100% */
export function muscleFreshnessMap(ctx: EngineContext): Record<MuscleGroup, number> {
  const map: Record<MuscleGroup, number> = {
    chest: 100,
    back: 100,
    shoulders: 100,
    arms: 100,
    legs: 100,
    abs: 100,
    glutes: 100,
  }
  for (const stimulus of ctx.muscleStimuli) {
    const elapsedHours = Math.max(0, (ctx.now.getTime() - stimulus.at.getTime()) / 3_600_000)
    map[stimulus.muscle] = calcFreshness(
      elapsedHours,
      effectiveRecoveryHours(stimulus.muscle, stimulus.setCount, ctx.tuning),
    )
  }
  return map
}
