import type { TanrenDB } from './db'
import { INITIAL_EQUIPMENT } from '../constants/equipment'

/** 初回起動時のシード投入(要件定義書 §4: Eiichiの初期器具) */
export async function seedInitialData(db: TanrenDB): Promise<void> {
  await db.equipment.bulkAdd(INITIAL_EQUIPMENT)
}
