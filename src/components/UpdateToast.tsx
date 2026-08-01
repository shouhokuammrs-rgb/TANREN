// PWA更新トースト(ISS-025)。画面下・タブバー上に浮かせる常駐トースト(鈍色・molten不使用)。
// /workout/active・/summaryでは完全非表示(保留)→ホーム復帰時に表示。✕で次回起動まで非表示
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PWA_COPY } from '../constants/copy'
import { applyPwaUpdate, subscribePwaUpdate } from '../utils/pwaUpdate'
import { updateToastState } from '../utils/updateToast'

export default function UpdateToast() {
  const location = useLocation()
  const [needRefresh, setNeedRefresh] = useState(false)
  const [dismissed, setDismissed] = useState(false) // メモリ保持=次回起動時に再表示
  const deferredRef = useRef(false)

  useEffect(() => subscribePwaUpdate(setNeedRefresh), [])

  const state = updateToastState(needRefresh, location.pathname, dismissed, deferredRef.current)
  deferredRef.current = state.deferred
  if (!state.show) return null

  return (
    <div
      className="anim-rise fixed inset-x-4 z-40 mx-auto max-w-md"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}
    >
      <div
        className="flex items-center justify-between rounded-[12px] py-1.5 pl-3.5 pr-1.5"
        style={{ background: '#1A110B', border: '1px solid #3A2213' }}
      >
        {/* タップ領域は行全体(視覚仕様) */}
        <button
          type="button"
          onClick={() => void applyPwaUpdate()}
          className="min-h-11 flex-1 text-left"
        >
          <span className="text-[13px] font-bold text-[#D9CFC6]">{PWA_COPY.updateAvailable}</span>
          <span className="label-mono ml-2 text-xs font-bold tracking-normal text-[#B06A3E]">
            {PWA_COPY.reload}
          </span>
        </button>
        <button
          type="button"
          aria-label={PWA_COPY.close}
          onClick={() => setDismissed(true)}
          className="flex h-11 w-11 items-center justify-center"
        >
          <span className="label-mono flex h-8 w-8 items-center justify-center text-[13px] font-bold tracking-normal text-[#6B5A4C]">
            ✕
          </span>
        </button>
      </div>
    </div>
  )
}
