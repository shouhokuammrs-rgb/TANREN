// メニュー生成エンジンの調整用定数(要件F-04)。Eiichiの体感フィードバックで頻繁に調整が入る前提。
// 一部はDEC-010で「上級者設定」のデフォルト値に降格(EngineContext.tuningで上書き可能)

import { RECOVERY_HOURS } from './recovery'
import type { EngineTuning } from '../engine/types'

/** 部位指定モードで、この値未満のフレッシュネス(%)の部位に警告を出す(ユーザー判断は尊重) */
export const FRESHNESS_WARN_THRESHOLD = 50

/**
 * おまかせ選択の対象になるフレッシュネス(%)の下限(DEC-006: 時間希望より回復を優先)。
 * 100=完全回復のみ。上級者設定で上書き可能なデフォルト値(DEC-010。例: 95で端数回復を許容)
 */
export const FRESHNESS_READY_THRESHOLD = 100

/** 推定時間が希望時間×この係数を下回ったら短縮通知を出す(DEC-006) */
export const SHORTENED_NOTICE_RATIO = 0.8

/** 使える時間(分)→ 同時に狙う部位数 */
export const MUSCLES_BY_TIME: { maxMinutes: number; muscleCount: number }[] = [
  { maxMinutes: 15, muscleCount: 1 },
  { maxMinutes: 30, muscleCount: 2 },
  { maxMinutes: 45, muscleCount: 2 },
  { maxMinutes: 60, muscleCount: 3 },
  { maxMinutes: Infinity, muscleCount: 4 },
]

/** 1セットの実行時間の見積り(秒) */
export const SET_EXEC_SEC = 45
/** 種目間の移行・セットアップ時間の見積り(秒)。重量変更・ベンチ角度調整を含む */
export const EXERCISE_SETUP_SEC = 90

/** 1種目の基本セット数。上級者設定で上書き可能なデフォルト値(DEC-010) */
export const DEFAULT_SETS = 3
/** セット削減時の下限 */
export const MIN_SETS = 2
/** 1部位あたりの最大種目数 */
export const MAX_EXERCISES_PER_MUSCLE = 2

/** コンディション別の総ボリューム係数(疲れ気味は-20%) */
export const CONDITION_VOLUME_FACTOR = {
  great: 1,
  normal: 1,
  tired: 0.8,
} as const

/** 疲れ気味のとき、レップ上限がこの値以下の高重量種目を回避する */
export const TIRED_AVOID_REP_MAX = 8

/**
 * 直近セッションのボリューム(部位あたり完了セット数)による回復時間の補正係数。
 * 軽い刺激なら早く回復し、高ボリュームなら回復が延びる(要件F-04-1「経過時間×ボリューム」)
 */
export const VOLUME_RECOVERY_FACTORS: { maxSets: number; factor: number }[] = [
  { maxSets: 5, factor: 0.85 },
  { maxSets: 9, factor: 1 },
  { maxSets: Infinity, factor: 1.15 },
]

/** initialWeightFactor未設定のダンベル種目に使う保守的な既定係数 */
export const DEFAULT_INITIAL_WEIGHT_FACTOR = 0.1

/** 強調ローテーション(DEC-012): LRU評価の対象にする部位ごとの直近セッション数 */
export const EMPHASIS_HISTORY_SESSIONS = 3

/** 「余裕あり」時の増量ステップ数(ISS-013b)。上級者設定で上書き可能なデフォルト値(DEC-010) */
export const SLACK_JUMP_STEPS = 2
/** 2ステップ増量の連続適用上限(暴走防止)。超えたら通常の1ステップ進行に戻す */
export const MAX_CONSECUTIVE_DOUBLE_JUMPS = 2

/**
 * 上級者設定(DEC-010)の許容範囲とデフォルト値。範囲外はUI側でclampして保存する。
 * これ以外の定数(時間見積り・部位数テーブル等)は設定化しない
 */
export const ENGINE_TUNING_RANGES: Record<
  keyof EngineTuning,
  { min: number; max: number; default: number }
> = {
  largeRecoveryHours: { min: 24, max: 120, default: RECOVERY_HOURS.large },
  smallRecoveryHours: { min: 24, max: 120, default: RECOVERY_HOURS.small },
  freshnessReadyThreshold: { min: 50, max: 100, default: FRESHNESS_READY_THRESHOLD },
  slackJumpSteps: { min: 1, max: 3, default: SLACK_JUMP_STEPS },
  defaultSets: { min: 2, max: 5, default: DEFAULT_SETS },
}
