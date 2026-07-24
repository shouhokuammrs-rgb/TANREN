// 休憩タイマーの準備アラーム(残り20秒・INS prep_alarm)。
// 発火判定はUI非依存の純関数に切り出してテストする。呼び出し側(実行画面のtick)が
// 前回状態(fired)をrefで持ち回り、毎tick評価する

/** 準備アラームを鳴らす残り秒数 */
export const PREP_ALARM_SEC = 20
/** 休憩開始からこの秒数未満では鳴らさない(短インターバルで完了直後に鳴る騒がしさを避ける) */
export const PREP_ALARM_MIN_ELAPSED_SEC = 10
/** 残り3秒カウント音の領域では鳴らさない(バックグラウンド復帰で一気に残りが飛んだ場合の衝突回避) */
const COUNTDOWN_SEC = 3

export interface PrepAlarmResult {
  /** このtickでアラームを発火するか */
  fire: boolean
  /** 次tickへ持ち回る発火済みフラグ */
  fired: boolean
}

/**
 * 準備アラームの発火判定。
 * - 残りがPREP_ALARM_SECに達した初回クロスで1回だけ発火
 * - ただし休憩開始から(totalSec - restSec)がPREP_ALARM_MIN_ELAPSED_SEC以上のときのみ
 *   (例: 25秒休憩では鳴らない。抑止された場合もクロスは消費済み=そのままでは再発火しない)
 * - タイマー延長で残りがPREP_ALARM_SECを再び上回ったら再武装し、次のクロスで再度鳴る
 *
 * @param restSec 残り秒(切り上げ)
 * @param totalSec 現在の休憩全体秒(±調整を反映した値)
 * @param fired 前tickまでの発火済みフラグ
 */
export function evaluatePrepAlarm(restSec: number, totalSec: number, fired: boolean): PrepAlarmResult {
  if (restSec > PREP_ALARM_SEC) {
    // 延長などで閾値の上に戻った: 再武装
    return { fire: false, fired: false }
  }
  if (fired) return { fire: false, fired: true }
  const fire = restSec > COUNTDOWN_SEC && totalSec - restSec >= PREP_ALARM_MIN_ELAPSED_SEC
  return { fire, fired: true }
}

/** 「準備」状態の視覚表示を出すか(音・バイブが使えない環境のフォールバック兼用) */
export function isPrepPhase(restSec: number, totalSec: number): boolean {
  return (
    restSec > 0 &&
    restSec <= PREP_ALARM_SEC &&
    totalSec >= PREP_ALARM_SEC + PREP_ALARM_MIN_ELAPSED_SEC
  )
}
