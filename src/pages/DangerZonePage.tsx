// 全データ削除の隔離画面(DEC-015 §4-4)。
// 2段確認: ①テキスト入力「削除」一致で実行ボタン有効化 ②ネイティブアラート最終確認。
// #D8321A(deep-red)を破壊操作の色として単独使用するのはこの画面限定
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DANGER_COPY, DATA_COPY } from '../constants/copy'
import { wipeAllData } from '../utils/backup'
import { exportBackupToFile } from '../utils/exportFile'

export default function DangerZonePage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const armed = text.trim() === DANGER_COPY.keyword

  const onExecute = async () => {
    if (!armed || busy) return
    if (!window.confirm(DATA_COPY.wipeConfirm2)) return
    setBusy(true)
    try {
      await wipeAllData()
      window.alert(DATA_COPY.wipeDone)
      navigate('/settings', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5">
      <Link to="/settings" className="inline-block py-1 text-xs text-ink-dim active:text-ink-mid">
        {DANGER_COPY.back}
      </Link>

      <h1 className="text-[22px] font-black text-ink">{DANGER_COPY.title}</h1>

      <ul className="space-y-1.5 rounded-card border border-line-ember p-4 text-sm text-ink-mid">
        {DANGER_COPY.bullets.map((b) => (
          <li key={b}>・{b}</li>
        ))}
      </ul>
      <p className="text-sm font-bold text-[#D9CFC6]">{DANGER_COPY.irreversible}</p>

      {/* 実行前のエクスポート導線 */}
      <button
        type="button"
        onClick={() => void exportBackupToFile()}
        className="h-11 text-sm font-bold text-[#FF7A33] active:opacity-70"
      >
        📤 {DANGER_COPY.exportFirst}
      </button>

      {/* 1段目: 確認テキスト入力(一致まで実行不可) */}
      <label className="block text-xs text-ink-mid">
        {DANGER_COPY.inputLabel}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 h-12 w-full rounded-chip bg-line-ember/40 px-3 text-base text-ink"
        />
      </label>

      <button
        type="button"
        disabled={!armed || busy}
        onClick={() => void onExecute()}
        className="h-14 w-full rounded-card text-sm font-bold"
        style={
          armed
            ? { background: '#D8321A', color: '#FFE3CC' }
            : { border: '1px solid #3A2213', color: '#4A3A2C' }
        }
      >
        {DANGER_COPY.execute}
      </button>
    </section>
  )
}
