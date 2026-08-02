// Screen Wake Lock制御(実行画面の消灯防止)。ISS-026でフックからテスト可能な形に分離。
// 非対応環境・省電力モードでの失敗は静かにスキップ(エラー表示なし・INS準拠)

export interface WakeLockSentinelLike {
  release(): Promise<void>
}

export interface WakeLockApiLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

export interface WakeLockController {
  acquire(): Promise<void>
  /** visibilitychange: バックグラウンド復帰でロックが自動解除されるため再取得する */
  handleVisibility(visible: boolean): void
  release(): Promise<void>
  readonly held: boolean
}

export function createWakeLockController(api: WakeLockApiLike | undefined): WakeLockController {
  let lock: WakeLockSentinelLike | null = null
  let released = false

  const acquire = async () => {
    if (!api || released) return
    try {
      lock = await api.request('screen')
    } catch {
      // 省電力モード等で失敗することがある。致命的ではないので握りつぶす
    }
  }

  return {
    acquire,
    handleVisibility(visible: boolean) {
      if (visible && !released) void acquire()
    },
    async release() {
      released = true
      await lock?.release().catch(() => {})
      lock = null
    },
    get held() {
      return lock !== null
    },
  }
}
