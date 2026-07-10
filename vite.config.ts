/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: {
        // フォント(Noto Sans JPのunicode-rangeサブセット多数)はプリキャッシュから外し、
        // 実際に使われたサブセットだけを実行時キャッシュ(§0-5の容量配慮+オフライン両立)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\.woff2?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tanren-fonts',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'TANREN',
        short_name: 'TANREN',
        description: '手持ち器具と過去ログから今日の最適メニューを生成する家トレコーチ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // 炉心パレット(デザイン仕様書v1 §1)
        theme_color: '#0b0907',
        background_color: '#0b0907',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
