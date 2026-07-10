import { Navigate, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import { STORAGE_COPY } from './constants/copy'
import { isPreviewHost, productionUrl } from './utils/env'
import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'
import ActiveWorkoutPage from './pages/ActiveWorkoutPage'
import LogPage from './pages/LogPage'
import LogDetailPage from './pages/LogDetailPage'
import SettingsPage from './pages/SettingsPage'
import SetupPage from './pages/SetupPage'
import SummaryPage from './pages/SummaryPage'
import PhotosPage from './pages/PhotosPage'

export default function App() {
  // ISS-010: 本番ホストはVITE_PROD_HOSTから取得。未設定なら警告無効(偽陽性防止)
  const onPreviewHost = isPreviewHost(window.location.hostname)
  const prodUrl = productionUrl()

  return (
    <div className="min-h-dvh text-ink">
      {/* プレビューURL警告(ISS-009-2): 一時URLでの記録を防ぐ */}
      {onPreviewHost && prodUrl && (
        <div className="bg-adjusting/15 px-4 py-2 text-center text-xs text-adjusting">
          ⚠️ {STORAGE_COPY.previewWarning}{' '}
          <a href={prodUrl} className="font-bold underline">
            {STORAGE_COPY.previewLink}
          </a>
        </div>
      )}
      {/* 下部タブに隠れないよう余白を確保 */}
      <main className="mx-auto max-w-md px-4 pt-6 pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/workout/active" element={<ActiveWorkoutPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/log/:id" element={<LogDetailPage />} />
          <Route path="/summary/:id" element={<SummaryPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
