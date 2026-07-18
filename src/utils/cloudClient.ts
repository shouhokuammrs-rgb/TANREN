// Supabaseクライアントの遅延シングルトン(Phase 5)。
// supabase-jsはここの動的importでのみ読み込む — 未ログイン端末ではバンドル・起動に影響させない
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../constants/cloud'

let clientPromise: Promise<SupabaseClient> | null = null

export function getCloudClient(): Promise<SupabaseClient> {
  // ログイン状態の自動維持はsupabase-jsデフォルト(localStorage永続+自動リフレッシュ)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
  )
  return clientPromise
}
