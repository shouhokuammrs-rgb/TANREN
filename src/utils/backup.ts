// JSONエクスポート/インポート/全削除(F-08)。
// 全テーブル+写真(Base64)を単一JSONに書き出し、インポートは全置換方式。
// versionフィールドで将来のスキーマ移行に備える

import { db, type TanrenDB } from '../db/db'
import { seedInitialData } from '../db/seed'

export const BACKUP_VERSION = 1

// ===== エクスポートリマインダー(ISS-009-3) =====

export const EXPORT_REMINDER_DAYS = 7
const LAST_EXPORT_KEY = 'tanren:lastExportAt'

/** エクスポート完了を記録する(共有シートのキャンセルは検知できないため実行時点で記録) */
export function recordExportDone(now = new Date()): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, now.toISOString())
  } catch {
    // localStorage不可でも動作は継続
  }
}

export function lastExportAt(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY)
    if (!raw) return null
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * バックアップリマインダーを出すべきか(ISS-009-3)。
 * 記録データがない端末では出さない。未エクスポート or 7日以上経過で出す
 */
export function shouldRemindExport(
  lastExport: Date | null,
  hasData: boolean,
  now = new Date(),
): boolean {
  if (!hasData) return false
  if (!lastExport) return true
  return now.getTime() - lastExport.getTime() > EXPORT_REMINDER_DAYS * 24 * 3_600_000
}

const TABLES = [
  'profiles',
  'goals',
  'equipment',
  'exercises',
  'sessions',
  'session_exercises',
  'sets',
  'photos',
  'body_stats',
  'injuries',
  'strength_marks',
  // ISS-012: UI設定(グラフ表示モード等)もバックアップ対象に含める
  'settings',
] as const

type TableName = (typeof TABLES)[number]

/** JSON化でISO文字列になるDate列(インポート時にDateへ復元する) */
const DATE_FIELDS: Partial<Record<TableName, string[]>> = {
  profiles: ['createdAt', 'updatedAt'],
  goals: ['createdAt'],
  sessions: ['startedAt', 'endedAt'],
  sets: ['completedAt'],
  photos: ['takenAt'],
  body_stats: ['measuredAt'],
  injuries: ['reportedAt'],
  strength_marks: ['recordedAt'],
}

export interface Backup {
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup(database: TanrenDB = db): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLES) {
    const rows = await database.table(name).toArray()
    if (name === 'photos') {
      tables[name] = await Promise.all(
        rows.map(async (row: { blob: Blob }) => {
          const { blob, ...rest } = row
          return { ...rest, blobBase64: await blobToBase64(blob), blobType: blob.type }
        }),
      )
    } else {
      tables[name] = rows
    }
  }
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables }
}

function reviveRow(name: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const revived = { ...row }
  for (const field of DATE_FIELDS[name] ?? []) {
    const value = revived[field]
    if (typeof value === 'string') revived[field] = new Date(value)
  }
  if (name === 'photos') {
    const { blobBase64, blobType, ...rest } = revived as {
      blobBase64?: string
      blobType?: string
    } & Record<string, unknown>
    if (typeof blobBase64 === 'string') {
      return { ...rest, blob: base64ToBlob(blobBase64, blobType || 'image/jpeg') }
    }
  }
  return revived
}

/** 全置換インポート。形式不正はErrorを投げる(呼び出し側で二段確認すること) */
export async function importBackup(input: unknown, database: TanrenDB = db): Promise<void> {
  const backup = input as Backup
  if (
    !backup ||
    typeof backup !== 'object' ||
    backup.version !== BACKUP_VERSION ||
    typeof backup.tables !== 'object'
  ) {
    throw new Error(`unsupported backup format (expected version ${BACKUP_VERSION})`)
  }
  const tableObjects = TABLES.map((name) => database.table(name))
  await database.transaction('rw', tableObjects, async () => {
    for (const name of TABLES) {
      await database.table(name).clear()
      const rows = backup.tables[name]
      if (Array.isArray(rows) && rows.length > 0) {
        await database
          .table(name)
          .bulkAdd(rows.map((r) => reviveRow(name, r as Record<string, unknown>)))
      }
    }
  })
}

/** 全データ削除(F-08)。初期シード(器具・種目・プロフィール)は再投入する */
export async function wipeAllData(database: TanrenDB = db): Promise<void> {
  const tableObjects = TABLES.map((name) => database.table(name))
  await database.transaction('rw', tableObjects, async () => {
    for (const name of TABLES) {
      await database.table(name).clear()
    }
  })
  await seedInitialData(database)
}
