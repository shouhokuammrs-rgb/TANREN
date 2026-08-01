// PWA更新検知(ISS-025)。vite-plugin-pwaの registerType:'prompt' + 標準フックのみ使用
// (自作SWロジック禁止・INS準拠)。virtual moduleのためテストは表示条件(updateToast.ts)側で行う
import { registerSW } from 'virtual:pwa-register'

type Listener = (needRefresh: boolean) => void

let needRefresh = false
let updateFn: ((reloadPage?: boolean) => Promise<void>) | null = null
const listeners = new Set<Listener>()

/** 起動時に1回呼ぶ。新SWの待機を検知したら購読者へ通知する */
export function initPwaUpdate(): void {
  updateFn = registerSW({
    onNeedRefresh() {
      needRefresh = true
      for (const l of listeners) l(true)
    },
  })
}

export function subscribePwaUpdate(listener: Listener): () => void {
  listeners.add(listener)
  listener(needRefresh)
  return () => {
    listeners.delete(listener)
  }
}

/** トーストのタップ: skipWaiting→リロード(vite-plugin-pwa標準のupdate関数) */
export async function applyPwaUpdate(): Promise<void> {
  await updateFn?.(true)
}
