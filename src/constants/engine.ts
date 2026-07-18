// メニュー生成エンジンの調整用定数(要件F-04)。Eiichiの体感フィードバックで頻繁に調整が入る前提

/** この値未満のフレッシュネス(%)の部位は「おまかせ」で原則選ばない。指定時は警告を出す */
export const FRESHNESS_WARN_THRESHOLD = 50

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

/** 1種目の基本セット数 */
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

/** 「余裕あり」フィードバック(ISS-013b): 上限レップ到達+余裕あり時の増量ステップ数 */
export const SLACK_JUMP_STEPS = 2
/** 2ステップ増量の連続適用上限(暴走防止)。超えたら通常の1ステップ進行に戻す */
export const MAX_CONSECUTIVE_DOUBLE_JUMPS = 2
