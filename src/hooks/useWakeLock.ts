import { useEffect } from 'react'

/**
 * トレ中の画面消灯を防ぐ(Screen Wake Lock API)。
 * バックグラウンド復帰でロックが解除されるため、visibilitychangeで再取得する
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // 省電力モード等で失敗することがある。致命的ではないので握りつぶす
      }
    }

    const onVisibilityChange = () => {
      if (!released && document.visibilityState === 'visible') {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
