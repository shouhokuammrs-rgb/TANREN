// データモデル定義(要件定義書 §7)
// テーブル: profiles / goals / equipment / exercises / sessions /
//           session_exercises / sets / photos / body_stats / injuries

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'abs'
  | 'glutes'

export type GoalType = 'lean' | 'bulk' | 'health' | 'focus'

export type AvoidReason = 'injury' | 'dislike' | 'developed'

export type EquipmentType = 'dumbbell' | 'bench' | 'bodyweight' | 'other'

export type MovementType = 'compound' | 'isolation'

/** 動作パターン。ピクトグラムの分類と筋力キャリブレーションの換算単位(ISS-001/002) */
export type MovementPattern =
  | 'horizontal_press'
  | 'vertical_press'
  | 'row'
  | 'hinge'
  | 'squat'
  | 'isolation'
  | 'core'

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'aborted'

export type Condition = 'great' | 'normal' | 'tired'

export type PhotoPose = 'front' | 'side' | 'back'

/** 食事タイミング(ISS-007) */
export type MealTiming = 'before' | 'within1h' | 'after2h'

// IndexedDBはbooleanをインデックスできないため、フラグは 0 | 1 で持つ
export type DbBool = 0 | 1

export interface Profile {
  id?: number
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  createdAt: Date
  updatedAt: Date
}

export interface Goal {
  id?: number
  profileId: number
  goalType: GoalType
  /** goalType === 'focus' のときの特化部位 */
  focusParts?: MuscleGroup[]
  /** 鍛えたい部位 */
  wantParts: MuscleGroup[]
  /** 鍛えたくない部位+理由タグ */
  avoidParts: { part: MuscleGroup; reason: AvoidReason }[]
  createdAt: Date
}

export interface Equipment {
  id?: number
  name: string
  type: EquipmentType
  quantity: number
  /** ダンベル用: 選択可能な重量の刻み(kg)。提案エンジンはこの配列にスナップする */
  weightStepsKg?: number[]
  /** ベンチ用: 最小角度(°) */
  minAngleDeg?: number
  /** ベンチ用: 最大角度(°) */
  maxAngleDeg?: number
  isActive: DbBool
  note?: string
}

export interface Exercise {
  id?: number
  name: string
  primaryMuscle: MuscleGroup
  muscleGroups: MuscleGroup[]
  movementType: MovementType
  movementPattern: MovementPattern
  requiredEquipment: EquipmentType[]
  repRangeMin: number
  repRangeMax: number
  /** フォームのコツ(2-3点・各1行以内。トレ中に片手で読める簡潔さ優先) */
  formCues: string[]
  /** よくあるミス(1点・1行以内) */
  commonMistake: string
  /** YouTube検索用キーワード(ISS-003)。未設定なら「<種目名> フォーム やり方」 */
  searchKeyword?: string
  /** 登録済みYouTube動画ID(ISS-003・上限3件。ユーザー登録値なのでマスタ同期で上書きしない) */
  youtubeVideoIds?: string[]
  /** ベンチ必須種目の推奨角度(°)。器具設定の角度範囲内かの判定に使う */
  benchAngleDeg?: number
  /** 初回提案重量 = 体重 × この係数(ダンベル1個あたり)。保守的な値にする */
  initialWeightFactor?: number
  isActive: DbBool
  note?: string
}

export interface Session {
  id?: number
  startedAt: Date
  endedAt?: Date
  status: SessionStatus
  /** このセッションで対象にした部位(履歴一覧の表示用) */
  muscles?: MuscleGroup[]
  /** セッション全体のメモ */
  sessionNote?: string
  /** その日のヒヤリング: 使える時間(分) */
  availableMinutes?: number
  condition?: Condition
  /** コンディション詳細(ISS-007・任意入力): 就寝時刻 'HH:mm' */
  sleepStart?: string
  /** 起床時刻 'HH:mm' */
  sleepEnd?: string
  /** 睡眠時間(時間・自動計算) */
  sleepHours?: number
  mealTiming?: MealTiming
  /** セッション全体のRPE(1-10) */
  rpe?: number
  /** 体調メモ(睡眠・食事・気分など) */
  conditionNote?: string
  /** 次回への申し送り */
  handoverNote?: string
}

export interface SessionExercise {
  id?: number
  sessionId: number
  exerciseId: number
  order: number
  rpe?: number
  note?: string
}

export interface SetRecord {
  id?: number
  sessionExerciseId: number
  setNumber: number
  suggestedWeightKg?: number
  suggestedReps?: number
  intervalSec?: number
  actualWeightKg?: number
  actualReps?: number
  /** 提案重量・レップに対する達成フラグ(次回提案に直結) */
  achieved?: boolean
  /** 「限界でした」フラグ(ISS-004): RPE10相当。次回はこの重量で増やさず様子を見る */
  atFailure?: boolean
  /** 「余裕あり」フラグ(ISS-013b): 上限レップ到達と組で次回2ステップ増量 */
  hadSlack?: boolean
  /** 絶好調時のPR挑戦セット */
  isPrAttempt?: boolean
  /** 自己新(F-07)。セッション完了時にエンジンのPR判定結果を保存する */
  isPr?: boolean
  completedAt?: Date
}

export interface Photo {
  id?: number
  takenAt: Date
  pose: PhotoPose
  blob: Blob
  note?: string
}

export interface BodyStat {
  id?: number
  measuredAt: Date
  weightKg?: number
  bodyFatPct?: number
  note?: string
}

/** アプリ設定のkey-value(ISS-012〜)。UI設定のうち端末バックアップに含めたいものはここへ */
export interface Setting {
  key: string
  value: unknown
}

/** 筋力の目安(ISS-002)。基準種目の実績から推定1RMを算出し初期重量提案に使う */
export interface StrengthMark {
  id?: number
  /** 基準種目ID(constants/strength.ts の REF_LIFTS) */
  refLiftId: string
  weightKg: number
  reps: number
  recordedAt: Date
}

export interface Injury {
  id?: number
  bodyPart: MuscleGroup
  note?: string
  reportedAt: Date
  isActive: DbBool
}
