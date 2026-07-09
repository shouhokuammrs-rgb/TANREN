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
  await syncExerciseMaster(db)
  if ((await db.profiles.count()) === 0) {
    const now = new Date()
    await db.profiles.add({ ...INITIAL_PROFILE, createdAt: now, updatedAt: now })
  }
}

/**
 * 種目マスタをコード側の定義に同期する(ISS-001)。
 * 名前で突合し、既存行はidとisActive(ユーザーの無効化)を保ったままマスタ項目を更新、
 * 未登録の種目は追加する。ログはexerciseIdで参照しているため履歴は壊れない
 */
async function syncExerciseMaster(db: TanrenDB): Promise<void> {
  const existing = await db.exercises.toArray()
  const byName = new Map(existing.map((e) => [e.name, e]))
  for (const master of INITIAL_EXERCISES) {
    const current = byName.get(master.name)
    if (current) {
      await db.exercises.update(current.id!, { ...master, isActive: current.isActive })
    } else {
      await db.exercises.add(master)
    }
  }
}
