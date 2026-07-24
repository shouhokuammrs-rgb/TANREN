// 準備アラーム(残り20秒)の発火判定テスト
import { describe, expect, it } from 'vitest'
import { evaluatePrepAlarm, isPrepPhase } from './prepAlarm'

/** tick列をシミュレートし、発火した残り秒を集める */
function run(restSecSeq: number[], totalSec: number, firedInit = false) {
  let fired = firedInit
  const fires: number[] = []
  for (const restSec of restSecSeq) {
    const result = evaluatePrepAlarm(restSec, totalSec, fired)
    fired = result.fired
    if (result.fire) fires.push(restSec)
  }
  return { fires, fired }
}

describe('evaluatePrepAlarm(発火条件)', () => {
  it('残り20秒のクロスで1回だけ発火する(以降のtickでは鳴らない)', () => {
    const { fires } = run([23, 22, 21, 20, 20, 19, 18, 10, 5], 90)
    expect(fires).toEqual([20])
  })

  it('休憩開始から10秒未満では鳴らない(25秒休憩の抑止例)', () => {
    // 25秒休憩: 残り20秒時点で経過5秒 → 発火しない。以降もクロス消費済みで鳴らない
    const { fires } = run([25, 24, 22, 20, 19, 15, 10, 5], 25)
    expect(fires).toEqual([])
  })

  it('経過ちょうど10秒は発火する(境界: 30秒休憩)', () => {
    const { fires } = run([22, 21, 20, 19], 30)
    expect(fires).toEqual([20])
  })

  it('タイマー延長で20秒を上回り再クロスしたら再度鳴る', () => {
    // 発火 → +15秒延長(残り33秒・total105秒) → 再クロスで再発火
    const first = run([21, 20, 19], 90)
    expect(first.fires).toEqual([20])
    const extended = run([33, 30, 25, 21, 20, 19], 105, first.fired)
    expect(extended.fires).toEqual([20])
  })

  it('残りが20秒を上回ると再武装される(firedがリセット)', () => {
    const result = evaluatePrepAlarm(33, 105, true)
    expect(result).toEqual({ fire: false, fired: false })
  })

  it('バックグラウンド復帰などで一気にカウント領域(残り3秒以下)へ飛んだ場合は鳴らさない', () => {
    // カウント音・終了チャイムと衝突させない
    const { fires } = run([25, 2], 90)
    expect(fires).toEqual([])
  })
})

describe('isPrepPhase(視覚フォールバックの表示条件)', () => {
  it('残り20秒以下かつ休憩が30秒以上のときだけ表示', () => {
    expect(isPrepPhase(20, 90)).toBe(true)
    expect(isPrepPhase(1, 90)).toBe(true)
    expect(isPrepPhase(21, 90)).toBe(false)
    expect(isPrepPhase(0, 90)).toBe(false)
    // 短インターバル(25秒)では常時表示になってしまうため出さない
    expect(isPrepPhase(20, 25)).toBe(false)
    expect(isPrepPhase(20, 30)).toBe(true) // 境界
  })
})
