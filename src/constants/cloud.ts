// クラウドバックアップ(Phase 5 / DEC-006)の接続情報。
// publishableキーは公開可能な値(安全性はSupabase側のRLSで担保。docs/engineering/setup/supabase_setup.sql 参照)
export const SUPABASE_URL = 'https://emzgkwvxjhdimqqndpmv.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dvPANDvOHxu3Ir9oW8CpUQ_DMOdizob'

/** バックアップ保管バケット。パスは backups/{user_id}/latest.json(直前世代は previous.json) */
export const CLOUD_BACKUP_BUCKET = 'backups'
export const CLOUD_LATEST_FILE = 'latest.json'
export const CLOUD_PREVIOUS_FILE = 'previous.json'

// Dexie settingsのキー(ISS-012のkey-value基盤を利用)
export const CLOUD_ENABLED_KEY = 'cloudEnabled' // 一度でもログインしたか(未ログイン端末でsupabase-jsをロードしないための旗)
export const CLOUD_LAST_SYNC_KEY = 'cloudLastSyncAt' // 最終クラウド同期(ISO文字列)
export const CLOUD_PENDING_KEY = 'cloudSyncPending' // オフライン等で未同期のバックアップが残っているか
