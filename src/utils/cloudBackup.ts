// クラウドバックアップ(Phase 5 / DEC-006)。
// ローカル(Dexie)が常に正で、クラウドは「最新スナップショットの保管庫」。フル同期はしない。
// アップロードは backups/{user_id}/latest.json、直前版を previous.json に退避(世代2つ)。
// テスト容易性のためsupabase-jsそのものではなく最小インターフェース(CloudClient)に依存する

import { db, type TanrenDB } from '../db/db'
import { getSetting, setSetting } from '../db/queries'
import {
  CLOUD_BACKUP_BUCKET,
  CLOUD_ENABLED_KEY,
  CLOUD_LAST_SYNC_KEY,
  CLOUD_LATEST_FILE,
  CLOUD_PENDING_KEY,
  CLOUD_PREVIOUS_FILE,
} from '../constants/cloud'
import { exportBackup, importBackup } from './backup'
import { getCloudClient } from './cloudClient'

interface CloudError {
  message: string
}

/** supabase-jsのうち本モジュールが使う表面だけを切り出した型(モック差し替え用) */
export interface CloudStorageApi {
  upload(
    path: string,
    body: string,
    options?: { upsert?: boolean; contentType?: string },
  ): Promise<{ error: CloudError | null }>
  download(path: string): Promise<{ data: Blob | null; error: CloudError | null }>
  copy(fromPath: string, toPath: string): Promise<{ error: CloudError | null }>
  remove(paths: string[]): Promise<{ error: CloudError | null }>
}

export interface CloudClient {
  auth: {
    getSession(): Promise<{
      data: { session: { user: { id: string; email?: string } } | null }
    }>
  }
  storage: { from(bucket: string): CloudStorageApi }
}

export type CloudSyncResult = 'uploaded' | 'skipped-unauth' | 'offline' | 'error'

export interface CloudSyncOptions {
  database?: TanrenDB
  /** テスト注入用。既定はnavigator.onLine(判定不能な環境はオンライン扱い) */
  isOnline?: () => boolean
}

function defaultIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

async function signedInUserId(client: CloudClient): Promise<string | null> {
  try {
    const { data } = await client.auth.getSession()
    return data.session?.user.id ?? null
  } catch {
    return null
  }
}

/**
 * 現在の全データをクラウドへアップロードする。
 * 未ログイン時は何もしない(設定にも触れない=従来動作と完全同一)。
 * オフライン・失敗時はpendingフラグを立て、次回起動時の再試行(retryPendingCloudBackup)に委ねる
 */
export async function uploadCloudBackup(
  client: CloudClient,
  opts: CloudSyncOptions = {},
): Promise<CloudSyncResult> {
  const database = opts.database ?? db
  const userId = await signedInUserId(client)
  if (!userId) return 'skipped-unauth'

  if (!(opts.isOnline ?? defaultIsOnline)()) {
    await setSetting(CLOUD_PENDING_KEY, true)
    return 'offline'
  }

  try {
    const json = JSON.stringify(await exportBackup(database))
    const bucket = client.storage.from(CLOUD_BACKUP_BUCKET)
    const latest = `${userId}/${CLOUD_LATEST_FILE}`
    const previous = `${userId}/${CLOUD_PREVIOUS_FILE}`
    // 世代退避: previousを消してからlatestを複製(初回はlatest不在でcopyが失敗するが無視してよい)
    await bucket.remove([previous]).catch(() => ({ error: null }))
    await bucket.copy(latest, previous).catch(() => ({ error: null }))
    const { error } = await bucket.upload(latest, json, {
      upsert: true,
      contentType: 'application/json',
    })
    if (error) throw new Error(error.message)
    await setSetting(CLOUD_LAST_SYNC_KEY, new Date().toISOString())
    await setSetting(CLOUD_PENDING_KEY, false)
    return 'uploaded'
  } catch {
    await setSetting(CLOUD_PENDING_KEY, true)
    return 'error'
  }
}

/** クラウドのlatest.jsonを取得して既存インポート処理(全置換)へ流す。二段確認は呼び出し側の責務 */
export async function restoreCloudBackup(
  client: CloudClient,
  database: TanrenDB = db,
): Promise<void> {
  const userId = await signedInUserId(client)
  if (!userId) throw new Error('not signed in')
  const { data, error } = await client.storage
    .from(CLOUD_BACKUP_BUCKET)
    .download(`${userId}/${CLOUD_LATEST_FILE}`)
  if (error || !data) throw new Error(error?.message ?? 'backup not found')
  await importBackup(JSON.parse(await data.text()), database)
}

/**
 * セッション保存成功時の自動アップロード(非同期・UI非ブロック前提で呼ぶ)。
 * 一度もログインしていない端末では即returnし、supabase-jsをロードしない
 */
export async function autoCloudBackup(opts: CloudSyncOptions = {}): Promise<CloudSyncResult> {
  if (!(await getSetting(CLOUD_ENABLED_KEY, false))) return 'skipped-unauth'
  return uploadCloudBackup(await getCloudClient(), opts)
}

/** 起動時の再試行: オフライン等で未同期のまま残っていたら自動アップロード */
export async function retryPendingCloudBackup(
  opts: CloudSyncOptions = {},
): Promise<CloudSyncResult | 'no-pending'> {
  if (!(await getSetting(CLOUD_ENABLED_KEY, false))) return 'no-pending'
  if (!(await getSetting(CLOUD_PENDING_KEY, false))) return 'no-pending'
  if (!(opts.isOnline ?? defaultIsOnline)()) return 'offline'
  return uploadCloudBackup(await getCloudClient(), opts)
}
