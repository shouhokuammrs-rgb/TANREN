/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** 本番ホスト名(ISS-010)。.env.production / Vercel環境変数で注入 */
  readonly VITE_PROD_HOST?: string
}
