import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyStat,
  Equipment,
  Exercise,
  Goal,
  Injury,
  Photo,
  Profile,
  Session,
  SessionExercise,
  SetRecord,
  Setting,
  StrengthMark,
} from './types'
import { seedInitialData } from './seed'

export type TanrenDB = Dexie & {
  profiles: EntityTable<Profile, 'id'>
  goals: EntityTable<Goal, 'id'>
  equipment: EntityTable<Equipment, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  sessions: EntityTable<Session, 'id'>
  session_exercises: EntityTable<SessionExercise, 'id'>
  sets: EntityTable<SetRecord, 'id'>
  photos: EntityTable<Photo, 'id'>
  body_stats: EntityTable<BodyStat, 'id'>
  injuries: EntityTable<Injury, 'id'>
  strength_marks: EntityTable<StrengthMark, 'id'>
  settings: EntityTable<Setting, 'key'>
}

export const db = new Dexie('tanren') as TanrenDB

// 第2引数以降はインデックス列のみ列挙する(Dexieは非列挙プロパティも保存する)
db.version(1).stores({
  profiles: '++id',
  goals: '++id, profileId, goalType',
  equipment: '++id, type, isActive',
  exercises: '++id, name, primaryMuscle, movementType, isActive, *muscleGroups',
  sessions: '++id, startedAt, status',
  session_exercises: '++id, sessionId, exerciseId',
  sets: '++id, sessionExerciseId',
  photos: '++id, takenAt, pose',
  body_stats: '++id, measuredAt',
  injuries: '++id, bodyPart, isActive',
})

// v2: 筋力の目安(ISS-002)。既存テーブルは引き継がれる
db.version(2).stores({
  strength_marks: '++id, refLiftId, recordedAt',
})

// v3: アプリ設定key-value(ISS-012: グラフ表示モード等)
db.version(3).stores({
  settings: '&key',
})

// 毎回のopen時に空テーブルへシード投入する(初回起動+リリース後のマスタ追加の両方に対応)
db.on('ready', () => seedInitialData(db), true)
