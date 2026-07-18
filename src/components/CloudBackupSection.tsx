// 設定「クラウドバックアップ」(Phase 5 / DEC-006)。
// 未ログイン: 登録/ログインフォーム。ログイン済み: 最終同期表示+今すぐ/復元/ログアウト。
// supabase-jsは一度でもログインした端末か、フォーム送信時にのみロードする(起動性能)
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CLOUD_ENABLED_KEY,
  CLOUD_LAST_SYNC_KEY,
  CLOUD_PENDING_KEY,
} from '../constants/cloud'
import { CLOUD_COPY, formatDate } from '../constants/copy'
import { getSetting, setSetting } from '../db/queries'
import { restoreCloudBackup, uploadCloudBackup } from '../utils/cloudBackup'
import { getCloudClient } from '../utils/cloudClient'
import { toastSyncResult } from '../utils/cloudToast'

export default function CloudBackupSection() {
  const cloudEnabled = useLiveQuery(() => getSetting(CLOUD_ENABLED_KEY, false), [], false)
  const lastSync = useLiveQuery(() => getSetting<string | null>(CLOUD_LAST_SYNC_KEY, null), [], null)
  const pending = useLiveQuery(() => getSetting(CLOUD_PENDING_KEY, false), [], false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ログイン実績のある端末のみ、セクション表示時にセッションを確認する
  useEffect(() => {
    if (!cloudEnabled) return
    let alive = true
    void getCloudClient().then(async (client) => {
      const { data } = await client.auth.getSession()
      if (alive) setUserEmail(data.session?.user.email ?? null)
    })
    return () => {
      alive = false
    }
  }, [cloudEnabled])

  const onAuth = async (mode: 'signIn' | 'signUp') => {
    setError(null)
    if (!email.includes('@') || password.length < 6) {
      setError(CLOUD_COPY.invalidInput)
      return
    }
    setBusy(true)
    try {
      const client = await getCloudClient()
      const { data, error: authError } =
        mode === 'signIn'
          ? await client.auth.signInWithPassword({ email, password })
          : await client.auth.signUp({ email, password })
      if (authError || !data.session) {
        setError(mode === 'signIn' ? CLOUD_COPY.authError : CLOUD_COPY.signUpError)
        return
      }
      setUserEmail(data.session.user.email ?? email)
      setPassword('')
      await setSetting(CLOUD_ENABLED_KEY, true)
      // ログイン直後に初回バックアップ(以降はトレ保存のたびに自動)
      toastSyncResult(await uploadCloudBackup(client))
    } catch {
      setError(mode === 'signIn' ? CLOUD_COPY.authError : CLOUD_COPY.signUpError)
    } finally {
      setBusy(false)
    }
  }

  const onSignOut = async () => {
    setBusy(true)
    try {
      const client = await getCloudClient()
      await client.auth.signOut()
      setUserEmail(null)
      await setSetting(CLOUD_ENABLED_KEY, false)
    } finally {
      setBusy(false)
    }
  }

  const onBackupNow = async () => {
    setBusy(true)
    try {
      toastSyncResult(await uploadCloudBackup(await getCloudClient()))
    } finally {
      setBusy(false)
    }
  }

  const onRestore = async () => {
    // 既存インポートと同じ全置換のため二段確認
    if (!window.confirm(CLOUD_COPY.restoreConfirm1)) return
    if (!window.confirm(CLOUD_COPY.restoreConfirm2)) return
    setBusy(true)
    try {
      await restoreCloudBackup(await getCloudClient())
      window.alert(CLOUD_COPY.restoreDone)
    } catch {
      window.alert(CLOUD_COPY.restoreError)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink placeholder:text-ink-dim'

  return (
    <>
      <h2 className="mt-6 text-sm font-semibold text-ink-mid">☁️ {CLOUD_COPY.section}</h2>
      <p className="mt-1 text-xs text-ink-dim">{CLOUD_COPY.hint}</p>
      <div className="mt-2 rounded-card bg-ember-tint border border-line-ember p-4">
        {userEmail ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{CLOUD_COPY.signedInAs(userEmail)}</p>
            <p className="text-xs text-ink-dim">
              {lastSync
                ? CLOUD_COPY.lastSync(formatDate(new Date(lastSync)))
                : CLOUD_COPY.neverSynced}
              {pending && (
                <span className="ml-1.5 rounded-chip bg-adjusting/15 px-1.5 py-0.5 text-[10px] font-bold text-adjusting">
                  {CLOUD_COPY.pendingBadge}
                </span>
              )}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onBackupNow()}
              className="h-12 w-full rounded-card bg-molten text-sm font-bold text-white active:bg-molten-bright disabled:opacity-40"
            >
              {busy ? CLOUD_COPY.working : `☁️ ${CLOUD_COPY.backupNow}`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRestore()}
              className="h-12 w-full rounded-card border border-line-ember text-sm font-semibold text-ink-mid active:bg-line-ember/60 disabled:opacity-40"
            >
              ⬇️ {CLOUD_COPY.restore}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSignOut()}
              className="h-11 w-full rounded-chip text-xs text-ink-dim active:text-ink-mid disabled:opacity-40"
            >
              {CLOUD_COPY.signOut}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs text-ink-mid">
              {CLOUD_COPY.email}
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs text-ink-mid">
              {CLOUD_COPY.password}
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAuth('signIn')}
                className="h-12 flex-1 rounded-card bg-molten text-sm font-bold text-white active:bg-molten-bright disabled:opacity-40"
              >
                {busy ? CLOUD_COPY.working : CLOUD_COPY.signIn}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAuth('signUp')}
                className="h-12 flex-1 rounded-card border border-line-ember text-sm font-semibold text-ink-mid active:bg-line-ember/60 disabled:opacity-40"
              >
                {CLOUD_COPY.signUp}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
