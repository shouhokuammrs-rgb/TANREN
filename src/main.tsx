import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { db } from './db/db'
import './index.css'

import { requestPersistentStorage } from './utils/storage'

// 初回起動時にDB作成+シード投入を確実に走らせる
db.open().catch((err) => console.error('DB初期化に失敗しました', err))
// 永続ストレージを要求(ISS-009)。結果は設定画面で確認できる
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
