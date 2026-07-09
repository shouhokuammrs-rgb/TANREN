import { Navigate, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'
import LogPage from './pages/LogPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      {/* 下部タブに隠れないよう余白を確保 */}
      <main className="mx-auto max-w-md px-4 pt-6 pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
