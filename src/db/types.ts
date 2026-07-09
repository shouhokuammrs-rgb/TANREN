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

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'aborted'

export type Condition = 'great' | 'normal' | 'tired'

export type PhotoPose = 'front' | 'side' | 'back'

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
  requiredEquipment: EquipmentType[]
  repRangeMin: number
  repRangeMax: number
  isActive: DbBool
  note?: string
}

export interface Session {
  id?: number
  startedAt: Date
  endedAt?: Date
  status: SessionStatus
  /** その日のヒヤリング: 使える時間(分) */
  availableMinutes?: number
  condition?: Condition
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

export interface Injury {
  id?: number
  bodyPart: MuscleGroup
  note?: string
  reportedAt: Date
  isActive: DbBool
}
