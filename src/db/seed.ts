import type { TanrenDB } from './db'
import { INITIAL_EQUIPMENT } from '../constants/equipment'
import { INITIAL_EXERCISES } from '../constants/exercises'
import { INITIAL_PROFILE } from '../constants/profile'

/**
 * シード投入(要件§4: Eiichiの初期データ)。
 * 空のテーブルにのみ投入するので、初回起動でも既存DBへの追加でも安全に呼べる。
 */
export async function seedInitialData(db: TanrenDB): Promise<void> {
  if ((await db.equipment.count()) === 0) {
    await db.equipment.bulkAdd(INITIAL_EQUIPMENT)
  }
  if ((await db.exercises.count()) === 0) {
    await db.exercises.bulkAdd(INITIAL_EXERCISES)
  }
  if ((await db.profiles.count()) === 0) {
    const now = new Date()
    await db.profiles.add({ ...INITIAL_PROFILE, createdAt: now, updatedAt: now })
  }
}
