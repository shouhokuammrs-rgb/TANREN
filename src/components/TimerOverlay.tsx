import { useEffect, useRef, useState } from 'react'
import { TIMER_COPY } from '../constants/copy'
import { countBeep, finishChime } from '../utils/audio'
import { vibrate } from '../utils/vibrate'

interface TimerOverlayProps {
  initialSec: number
  onDone: () => void
}

const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * インターバルタイマー(F-05)。
 * 円形カウントダウン、残り3秒からカウント音、終了でバイブ+音(iOSはバイブ非対応のため画面点滅で代替)、
 * ±15秒調整、スキップ可。バックグラウンド落ちに耐えるよう終了時刻ベースで計時する
 */
export default function TimerOverlay({ initialSec, onDone }: TimerOverlayProps) {
  const [totalSec, setTotalSec] = useState(initialSec)
  const [endAt, setEndAt] = useState(() => Date.now() + initialSec * 1000)
  const [remainingMs, setRemainingMs] = useState(initialSec * 1000)
  const [finished, setFinished] = useState(false)
  const lastBeepSecRef = useRef<number | null>(null)

  useEffect(() => {
    if (finished) return
    const tick = () => {
      const rest = endAt - Date.now()
      setRemainingMs(Math.max(0, rest))
      const restSec = Math.ceil(rest / 1000)
      if (rest > 0 && restSec <= 3 && lastBeepSecRef.current !== restSec) {
        lastBeepSecRef.current = restSec
        countBeep()
      }
      if (rest <= 0) {
        setFinished(true)
        finishChime()
        vibrate([400, 150, 400])
      }
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [endAt, finished])

  // 終了後は点滅表示を1.6秒見せてから閉じる(iOSバイブ非対応の視覚フォールバックを兼ねる)
  useEffect(() => {
    if (!finished) return
    const id = setTimeout(onDone, 1600)
    return () => clearTimeout(id)
  }, [finished, onDone])

  const adjust = (deltaSec: number) => {
    if (finished) return
    setEndAt((prev) => {
      const next = Math.max(Date.now() + 1000, prev + deltaSec * 1000)
      setTotalSec((t) => Math.max(1, t + Math.round((next - prev) / 1000)))
      return next
    })
  }

  const remainingSec = Math.ceil(remainingMs / 1000)
  const progress = totalSec > 0 ? remainingMs / (totalSec * 1000) : 0
  const mm = Math.floor(remainingSec / 60)
  const ss = remainingSec % 60

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 transition-colors ${
        finished ? 'animate-pulse bg-orange-500/90' : 'bg-slate-950/95'
      }`}
    >
      <p className="text-sm text-slate-300">{finished ? TIMER_COPY.finished : TIMER_COPY.resting}</p>
      <div className="relative">
        <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true">
          <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="#1e293b" strokeWidth="12" />
          <circle
            cx="140"
            cy="140"
            r={RADIUS}
            fill="none"
            stroke={finished ? '#ffffff' : '#fb923c'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            transform="rotate(-90 140 140)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-bold tabular-nums">
            {mm}:{ss.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="h-12 rounded-full bg-slate-800 px-5 text-sm font-semibold text-slate-200 active:bg-slate-700"
        >
          −15{TIMER_COPY.secondsSuffix}
        </button>
        <button
          type="button"
          onClick={() => adjust(15)}
          className="h-12 rounded-full bg-slate-800 px-5 text-sm font-semibold text-slate-200 active:bg-slate-700"
        >
          +15{TIMER_COPY.secondsSuffix}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-12 rounded-full bg-slate-700 px-5 text-sm font-semibold text-white active:bg-slate-600"
        >
          {TIMER_COPY.skip}
        </button>
      </div>
    </div>
  )
}
