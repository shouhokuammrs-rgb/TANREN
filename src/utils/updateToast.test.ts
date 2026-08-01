// PWA更新トーストの表示条件テスト(ISS-025)
import { describe, expect, it } from 'vitest'
import { updateToastState } from './updateToast'

describe('updateToastState(ISS-025): 保留と表示の条件', () => {
  it('更新なし・閉じた後は表示しない', () => {
    expect(updateToastState(false, '/', false, false).show).toBe(false)
    expect(updateToastState(true, '/', true, false).show).toBe(false)
  })

  it('保留対象外の画面で検知したら即表示(常駐)', () => {
    expect(updateToastState(true, '/', false, false)).toEqual({ show: true, deferred: false })
  })

  it('/workout/active では完全非表示に保留する', () => {
    expect(updateToastState(true, '/workout/active', false, false)).toEqual({
      show: false,
      deferred: true,
    })
  })

  it('/summary でも保留する(PM裁定追記)', () => {
    expect(updateToastState(true, '/summary/12', false, false)).toEqual({
      show: false,
      deferred: true,
    })
  })

  it('保留後は途中画面(ログ等)でも出さず、ホーム復帰時に表示する', () => {
    const afterActive = updateToastState(true, '/workout/active', false, false)
    const onLog = updateToastState(true, '/log/12', false, afterActive.deferred)
    expect(onLog).toEqual({ show: false, deferred: true })
    const onHome = updateToastState(true, '/', false, onLog.deferred)
    expect(onHome).toEqual({ show: true, deferred: false })
  })

  it('保留なしなら成長タブ等でもそのまま表示される', () => {
    expect(updateToastState(true, '/growth', false, false)).toEqual({
      show: true,
      deferred: false,
    })
  })
})
