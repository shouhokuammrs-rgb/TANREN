// インターバルテーブル(要件F-04-5)。調整が頻繁に入る前提の定数ファイル

/** 目的別インターバル(秒) */
export const INTERVAL_TABLE = {
  /** 筋力(1-5レップ) */
  strength: 180,
  /** 筋肥大(6-12レップ) */
  hypertrophy: 90,
  /** 持久・引き締め(13+レップ) */
  endurance: 60,
} as const

export type TrainingPurpose = keyof typeof INTERVAL_TABLE

/** レップ帯の境界 */
export const REP_THRESHOLDS = {
  /** これ以下は筋力 */
  strengthMaxReps: 5,
  /** これ以下は筋肥大(超えたら持久) */
  hypertrophyMaxReps: 12,
} as const

/** コンパウンド種目への加算(秒) */
export const COMPOUND_BONUS_SEC = 30
