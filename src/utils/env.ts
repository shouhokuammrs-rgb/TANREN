// 実行環境の判定(ISS-009-2 / ISS-010)

/**
 * 本番ホスト名。ハードコードせずビルド時環境変数から取得する(ISS-010)。
 * 設定場所: リポジトリの .env.production(デフォルト値)または Vercelの環境変数 VITE_PROD_HOST
 */
export const PROD_HOST: string | undefined = import.meta.env.VITE_PROD_HOST || undefined

/** 本番URL。ホスト未設定ならundefined */
export function productionUrl(prodHost: string | undefined = PROD_HOST): string | undefined {
  return prodHost ? `https://${prodHost}/` : undefined
}

/**
 * Vercelのプレビュー(一時)URLかどうか。本番ホスト以外の *.vercel.app が対象。
 * 本番ホスト未設定時は常にfalse=警告無効(偽陽性より無警告の方がマシ: ISS-010)
 */
export function isPreviewHost(
  hostname: string,
  prodHost: string | undefined = PROD_HOST,
): boolean {
  if (!prodHost) return false
  return hostname.endsWith('.vercel.app') && hostname !== prodHost
}
