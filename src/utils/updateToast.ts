// PWA更新トーストの表示条件(ISS-025・純関数)。
// /workout/active(タイマー中)と/summary(PR演出・鏡チェック中)では完全非表示に保留し、
// 保留が発生したらホーム復帰時に表示する。閉じたら次回起動まで非表示(dismissedはメモリ保持)

export interface UpdateToastState {
  show: boolean
  /** 保留対象ルートで検知した(またはその後ホーム未復帰の)状態 */
  deferred: boolean
}

const SUPPRESSED_PREFIXES = ['/workout/active', '/summary']

export function isSuppressedRoute(pathname: string): boolean {
  return SUPPRESSED_PREFIXES.some((p) => pathname.startsWith(p))
}

export function updateToastState(
  needRefresh: boolean,
  pathname: string,
  dismissed: boolean,
  deferred: boolean,
): UpdateToastState {
  if (!needRefresh || dismissed) return { show: false, deferred }
  if (isSuppressedRoute(pathname)) return { show: false, deferred: true }
  // 保留後は途中画面(ログ等)を挟んでもホーム復帰まで待つ(PM裁定: 表示タイミングはホーム復帰時)
  if (deferred && pathname !== '/') return { show: false, deferred: true }
  return { show: true, deferred: false }
}
