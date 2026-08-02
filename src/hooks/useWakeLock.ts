import { useEffect } from 'react'
import { createWakeLockController } from '../utils/wakeLock'

/**
 * トレ中の画面消灯を防ぐ(Screen Wake Lock API)。
 * 取得・再取得・解放の制御はutils/wakeLock.tsのコントローラ(ユニットテスト対象・ISS-026)
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const controller = createWakeLockController(
      'wakeLock' in navigator ? navigator.wakeLock : undefined,
    )
    const onVisibilityChange = () =>
      controller.handleVisibility(document.visibilityState === 'visible')

    void controller.acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void controller.release()
    }
  }, [active])
}
