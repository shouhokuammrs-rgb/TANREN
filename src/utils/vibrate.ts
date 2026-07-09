/**
 * バイブレーション(Vibration API)。
 * iOS Safariは非対応のため、falseを返した場合は視覚点滅でフォールバックする
 */
export function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false
  }
  return navigator.vibrate(pattern)
}
