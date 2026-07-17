import type { Condition, Exercise, MovementPattern, MuscleGroup } from '../db/types'

/** 過去ログ1セット分の実績 */
export interface SetPerformance {
  weightKg?: number
  reps?: number
  achieved?: boolean
  /** 「限界でした」(ISS-004)。trueのセットがあれば次回は増量せず様子を見る */
  atFailure?: boolean
  /** 「余裕あり」(ISS-013b)。上限レップ到達と組み合わさると次回2ステップ増量 */
  hadSlack?: boolean
}

/** 種目ごとの直近実績 */
export interface ExerciseHistoryEntry {
  exerciseId: number
  performedAt: Date
  sets: SetPerformance[]
}

/** 部位ごとの直近刺激(回復モデルの入力) */
export interface MuscleStimulus {
  muscle: MuscleGroup
  at: Date
  /** そのセッションで対象部位に入った完了セット数(回復時間のボリューム補正に使う) */
  setCount: number
}

/** エンジンへの入力スナップショット。DBアクセスはUI層で済ませ、エンジンは純関数に保つ */
export interface EngineContext {
  now: Date
  bodyWeightKg: number
  /** 使用可能なダンベル重量の刻み(昇順)。空なら自重種目のみ */
  dumbbellStepsKg: number[]
  /** ベンチがない場合はundefined */
  bench?: { minAngleDeg: number; maxAngleDeg: number }
  /** 有効な種目マスタ */
  exercises: Exercise[]
  /** 種目ID→直近実績 */
  lastPerformance: Map<number, ExerciseHistoryEntry>
  /** 種目ID→直近実績より前の実績(新しい順・最大2件)。2ステップ増量の連続回数判定に使う(ISS-013b) */
  performanceHistory?: Map<number, ExerciseHistoryEntry[]>
  /** 部位ごとの直近刺激(なければその部位は完全回復扱い) */
  muscleStimuli: MuscleStimulus[]
  /** 有効な痛み・違和感フラグの部位(メニューから自動回避) */
  activeInjuries: MuscleGroup[]
  /** 筋力キャリブレーション由来のパターン別基準1RM(ISS-002)。未入力なら省略可 */
  patternBase1Rm?: Partial<Record<MovementPattern, number>>
  /** ギャップ分析(F-03)由来の部位別優先度スコア。未設定なら全部位1.0 */
  priorityScores?: Record<MuscleGroup, number>
}

export interface MenuRequest {
  /** 今日使える時間(分): 15 / 30 / 45 / 60 / 90 */
  availableMinutes: number
  /** 鍛えたい部位。空配列は「おまかせ」 */
  targetMuscles: MuscleGroup[]
  condition: Condition
}

/** 1種目分の処方(セット・重量・レップ・インターバル) */
export interface Prescription {
  sets: number
  suggestedReps: number
  /** 自重種目はundefined。ダンベル種目は必ず器具設定の刻みの値 */
  suggestedWeightKg?: number
  intervalSec: number
  /** 絶好調時: 最終セットをPR挑戦(次の重量ステップ)にする */
  isPrAttempt?: boolean
}

export interface MenuItem extends Prescription {
  exerciseId: number
}

export interface GeneratedMenu {
  items: MenuItem[]
  muscles: MuscleGroup[]
  /** 部位選択の根拠などの説明文 */
  rationale: string
  warnings: string[]
  estimatedMinutes: number
}
