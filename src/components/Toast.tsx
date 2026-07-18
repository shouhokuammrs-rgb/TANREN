// 超軽量トースト表示(Phase 5)。発火はutils/toast.tsのshowToast()から
import { useEffect, useState } from 'react'
import { subscribeToast, type ToastMessage } from '../utils/toast'

/** App直下に1つだけマウントする。3秒で自動消滅・タップで即閉じ */
export function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => subscribeToast(setToast), [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  if (!toast) return null
  return (
    <button
      type="button"
      onClick={() => setToast(null)}
      className={`anim-rise fixed bottom-24 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-pill border px-4 py-2.5 text-xs font-semibold shadow-lg ${
        toast.tone === 'success'
          ? 'border-achieved/40 bg-forge-black text-achieved'
          : toast.tone === 'info'
            ? 'border-adjusting/40 bg-forge-black text-adjusting'
            : 'border-destructive/40 bg-forge-black text-destructive'
      }`}
    >
      {toast.text}
    </button>
  )
}
