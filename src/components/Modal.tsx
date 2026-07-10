import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** モバイル用ボトムシートモーダル */
export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-line-ember bg-forge-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-ink-dim"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
