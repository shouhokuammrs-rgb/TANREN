// Wake Lockコントローラのテスト(ISS-026)。API取得・可視復帰の再取得・解放
import { describe, expect, it, vi } from 'vitest'
import { createWakeLockController, type WakeLockApiLike } from './wakeLock'

function mockApi() {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release }))
  return { api: { request } as WakeLockApiLike, request, release }
}

describe('createWakeLockController(ISS-026)', () => {
  it('acquireでscreenロックを取得する', async () => {
    const { api, request } = mockApi()
    const controller = createWakeLockController(api)
    await controller.acquire()
    expect(request).toHaveBeenCalledWith('screen')
    expect(controller.held).toBe(true)
  })

  it('非対応環境(APIなし)は静かにスキップ', async () => {
    const controller = createWakeLockController(undefined)
    await expect(controller.acquire()).resolves.toBeUndefined()
    expect(controller.held).toBe(false)
  })

  it('取得失敗(省電力モード等)は握りつぶす', async () => {
    const controller = createWakeLockController({
      request: () => Promise.reject(new Error('denied')),
    })
    await expect(controller.acquire()).resolves.toBeUndefined()
    expect(controller.held).toBe(false)
  })

  it('可視復帰(visibilitychange)で再取得する', async () => {
    const { api, request } = mockApi()
    const controller = createWakeLockController(api)
    await controller.acquire()
    controller.handleVisibility(true)
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('releaseでロックを解放し、以後は再取得しない(退出後の復帰イベント対策)', async () => {
    const { api, request, release } = mockApi()
    const controller = createWakeLockController(api)
    await controller.acquire()
    await controller.release()
    expect(release).toHaveBeenCalled()
    expect(controller.held).toBe(false)
    controller.handleVisibility(true)
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1) // 増えない
  })

  it('非可視への遷移では取得しない', async () => {
    const { api, request } = mockApi()
    const controller = createWakeLockController(api)
    controller.handleVisibility(false)
    await Promise.resolve()
    expect(request).not.toHaveBeenCalled()
  })
})
