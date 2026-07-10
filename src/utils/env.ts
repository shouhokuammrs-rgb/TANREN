// 実行環境の判定(ISS-009-2)

export const PRODUCTION_HOST = 'tanren.vercel.app'
export const PRODUCTION_URL = `https://${PRODUCTION_HOST}/`

/**
 * Vercelのプレビュー(一時)URLかどうか。
 * 本番ホスト以外の *.vercel.app が対象。localhost等の開発環境は対象外
 */
export function isPreviewHost(hostname: string): boolean {
  return hostname.endsWith('.vercel.app') && hostname !== PRODUCTION_HOST
}
