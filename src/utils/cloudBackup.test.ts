// クラウドバックアップ(Phase 5)のユニットテスト。supabase-jsはモック(CloudClient)で置き換える
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CLOUD_ENABLED_KEY,
  CLOUD_LAST_SYNC_KEY,
  CLOUD_PENDING_KEY,
} from '../constants/cloud'
import { db } from '../db/db'
import { getSetting, setSetting } from '../db/queries'
import { exportBackup } from './backup'
import {
  autoCloudBackup,
  restoreCloudBackup,
  uploadCloudBackup,
  type CloudClient,
} from './cloudBackup'

interface Recorded {
  upload: unknown[][]
  copy: unknown[][]
  remove: unknown[][]
  download: unknown[][]
}

function fakeClient(opts: {
  signedIn?: boolean
  uploadError?: string
  downloadJson?: string
} = {}): { client: CloudClient; calls: Recorded } {
  const calls: Recorded = { upload: [], copy: [], remove: [], download: [] }
  const client: CloudClient = {
    auth: {
      getSession: async () => ({
        data: {
          session:
            (opts.signedIn ?? true)
              ? { user: { id: 'user-1', email: 'shouhoku.ammrs@gmail.com' } }
              : null,
        },
      }),
    },
    storage: {
      from: () => ({
        upload: async (...args: unknown[]) => {
          calls.upload.push(args)
          return { error: opts.uploadError ? { message: opts.uploadError } : null }
        },
        copy: async (...args: unknown[]) => {
          calls.copy.push(args)
          return { error: null }
        },
        remove: async (...args: unknown[]) => {
          calls.remove.push(args)
          return { error: null }
        },
        download: async (...args: unknown[]) => {
          calls.download.push(args)
          return opts.downloadJson !== undefined
            ? { data: new Blob([opts.downloadJson], { type: 'application/json' }), error: null }
            : { data: null, error: { message: 'Object not found' } }
        },
      }),
    },
  }
  return { client, calls }
}

async function clearCloudSettings() {
  await db.settings.clear()
}

describe('uploadCloudBackup(自動/手動アップロード)', () => {
  beforeEach(async () => {
    await db.open()
    await clearCloudSettings()
  })

  it('ログイン済み+オンライン: latest.jsonへupsertアップロードし、世代退避と同期情報を更新する', async () => {
    const { client, calls } = fakeClient()
    const result = await uploadCloudBackup(client, { isOnline: () => true })
    expect(result).toBe('uploaded')
    // 世代退避: previous削除→latestをprevious.jsonへ複製→latest.jsonをupsert
    expect(calls.remove[0][0]).toEqual(['user-1/previous.json'])
    expect(calls.copy[0]).toEqual(['user-1/latest.json', 'user-1/previous.json'])
    expect(calls.upload[0][0]).toBe('user-1/latest.json')
    expect(calls.upload[0][2]).toMatchObject({ upsert: true, contentType: 'application/json' })
    // アップロード内容は既存エクスポート形式のJSON
    const body = JSON.parse(calls.upload[0][1] as string)
    expect(body.version).toBe(1)
    expect(body.tables).toBeTruthy()
    expect(await getSetting(CLOUD_LAST_SYNC_KEY, null)).not.toBeNull()
    expect(await getSetting(CLOUD_PENDING_KEY, true)).toBe(false)
  })

  it('オフライン: アップロードせずpendingフラグを立てる(次回起動時の再試行に委ねる)', async () => {
    const { client, calls } = fakeClient()
    const result = await uploadCloudBackup(client, { isOnline: () => false })
    expect(result).toBe('offline')
    expect(calls.upload).toHaveLength(0)
    expect(await getSetting(CLOUD_PENDING_KEY, false)).toBe(true)
    expect(await getSetting(CLOUD_LAST_SYNC_KEY, null)).toBeNull()
  })

  it('未ログイン: 何もせず設定にも触れない(従来動作と完全同一)', async () => {
    const { client, calls } = fakeClient({ signedIn: false })
    const result = await uploadCloudBackup(client, { isOnline: () => true })
    expect(result).toBe('skipped-unauth')
    expect(calls.upload).toHaveLength(0)
    expect(await db.settings.count()).toBe(0)
  })

  it('アップロード失敗: pendingを立ててerrorを返す(同期日時は更新しない)', async () => {
    const { client } = fakeClient({ uploadError: 'network error' })
    const result = await uploadCloudBackup(client, { isOnline: () => true })
    expect(result).toBe('error')
    expect(await getSetting(CLOUD_PENDING_KEY, false)).toBe(true)
    expect(await getSetting(CLOUD_LAST_SYNC_KEY, null)).toBeNull()
  })
})

describe('restoreCloudBackup(クラウドから復元)', () => {
  beforeEach(async () => {
    await db.open()
    await clearCloudSettings()
    await db.body_stats.clear()
  })

  it('latest.jsonを取得して全置換インポートする', async () => {
    await db.body_stats.add({ measuredAt: new Date('2026-07-01T09:00:00'), weightKg: 58 })
    const snapshot = JSON.stringify(await exportBackup())
    // スナップショット後に増えた記録は復元で消える(全置換)
    await db.body_stats.add({ measuredAt: new Date('2026-07-18T09:00:00'), weightKg: 57.5 })
    expect(await db.body_stats.count()).toBe(2)

    const { client, calls } = fakeClient({ downloadJson: snapshot })
    await restoreCloudBackup(client)
    expect(calls.download[0][0]).toBe('user-1/latest.json')
    expect(await db.body_stats.count()).toBe(1)
    expect((await db.body_stats.toArray())[0].weightKg).toBe(58)
  })

  it('未ログインやバックアップ不在はエラー(ローカルは無傷)', async () => {
    await db.body_stats.add({ measuredAt: new Date(), weightKg: 58 })
    await expect(restoreCloudBackup(fakeClient({ signedIn: false }).client)).rejects.toThrow()
    await expect(restoreCloudBackup(fakeClient().client)).rejects.toThrow()
    expect(await db.body_stats.count()).toBe(1)
  })
})

describe('autoCloudBackup(セッション保存時のフック)', () => {
  beforeEach(async () => {
    await db.open()
    await clearCloudSettings()
  })

  it('一度もログインしていない端末では即スキップ(supabase-jsをロードしない)', async () => {
    expect(await autoCloudBackup()).toBe('skipped-unauth')
  })

  it('cloudEnabledでもpendingが無ければ再試行はno-pending', async () => {
    await setSetting(CLOUD_ENABLED_KEY, true)
    const { retryPendingCloudBackup } = await import('./cloudBackup')
    expect(await retryPendingCloudBackup({ isOnline: () => true })).toBe('no-pending')
  })
})
