import { Navigate, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import { STORAGE_COPY } from './constants/copy'
import { PRODUCTION_URL, isPreviewHost } from './utils/env'
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
  const onPreviewHost = isPreviewHost(window.location.hostname)

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      {/* プレビューURL警告(ISS-009-2): 一時URLでの記録を防ぐ */}
      {onPreviewHost && (
        <div className="bg-yellow-500/15 px-4 py-2 text-center text-xs text-yellow-300">
          ⚠️ {STORAGE_COPY.previewWarning}{' '}
          <a href={PRODUCTION_URL} className="font-bold underline">
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
