import { Suspense, lazy, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import FreshnessBodyMap from '../components/FreshnessBodyMap'
import Modal from '../components/Modal'
import { MUSCLE_CHART_ORDER } from '../constants/charts'
import {
  DASHBOARD_COPY,
  HOME_COPY,
  SETTINGS_COPY,
  SETUP_COPY,
  STORAGE_COPY,
  formatDate,
} from '../constants/copy'
import { db } from '../db/db'
import { lastExportAt, shouldRemindExport } from '../utils/backup'
import {
  addBodyWeight,
  listBodyStats,
  loadEngineContext,
  loadGoal,
  weeklyVolumeHistory,
} from '../db/queries'
import { muscleFreshnessMap } from '../engine'
import { useLocalSetting } from '../hooks/useLocalSetting'

// Rechartsは重いので遅延チャンクに分離(初期表示を軽く保つ)
const VolumeChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.VolumeChart })),
)
const WeightChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.WeightChart })),
)

const chartFallback = <p className="py-6 text-center text-sm text-slate-500">…</p>

export default function HomePage() {
  const [bannerDismissed, setBannerDismissed] = useLocalSetting('setupBannerDismissed', false)
  const [weightModal, setWeightModal] = useState(false)

  const goal = useLiveQuery(async () => (await loadGoal()) ?? null)
  // バックアップリマインダー(ISS-009-3): 記録データがあり、7日以上エクスポートが空いたら
  const exportReminder = useLiveQuery(async () => {
    const hasData = (await db.sessions.count()) > 0
    return { show: shouldRemindExport(lastExportAt(), hasData), never: lastExportAt() === null }
  })
  const volumeHistory = useLiveQuery(() => weeklyVolumeHistory())
  const freshness = useLiveQuery(async () => muscleFreshnessMap(await loadEngineContext()))
  const bodyStats = useLiveQuery(listBodyStats)

  const volumeData = volumeHistory?.map((p) => {
    const row: Record<string, number | string> = { week: p.weekLabel }
    for (const m of MUSCLE_CHART_ORDER) row[m] = p.sets[m] ?? 0
    return row
  })
  const hasVolume = volumeHistory?.some((p) => Object.keys(p.sets).length > 0) ?? false

  const weightData = bodyStats?.map((s) => ({
    date: formatDate(s.measuredAt).split(' ')[0],
    weightKg: s.weightKg,
  }))

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{HOME_COPY.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{HOME_COPY.subtitle}</p>
      </div>

      {goal === null && !bannerDismissed && (
        <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
          <p className="text-sm">{SETUP_COPY.banner}</p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/setup"
              className="flex h-11 flex-1 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white active:bg-orange-600"
            >
              {SETUP_COPY.bannerCta}
            </Link>
            <button
              type="button"
              className="h-11 rounded-lg bg-slate-800 px-4 text-sm text-slate-300 active:bg-slate-700"
              onClick={() => setBannerDismissed(true)}
            >
              {SETUP_COPY.bannerSkip}
            </button>
          </div>
        </div>
      )}

      <Link
        to="/workout"
        className="flex h-16 w-full items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white active:bg-orange-600"
      >
        {HOME_COPY.startCta} 💪
      </Link>

      {exportReminder?.show && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3 text-xs text-slate-300">
          <span>💾 {exportReminder.never ? STORAGE_COPY.reminderNever : STORAGE_COPY.reminder}</span>
          <Link
            to="/settings"
            className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-200 active:bg-slate-700"
          >
            {STORAGE_COPY.reminderCta}
          </Link>
        </div>
      )}

      <div className="rounded-xl bg-slate-900 p-4">
        <h2 className="mb-2 text-xs font-semibold text-slate-400">
          {DASHBOARD_COPY.weeklyVolume}
        </h2>
        {hasVolume && volumeData ? (
          <Suspense fallback={chartFallback}>
            <VolumeChart data={volumeData} />
          </Suspense>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">{DASHBOARD_COPY.empty}</p>
        )}
      </div>

      <div className="rounded-xl bg-slate-900 p-4">
        <h2 className="mb-2 text-xs font-semibold text-slate-400">{DASHBOARD_COPY.freshness}</h2>
        {freshness ? <FreshnessBodyMap freshness={freshness} /> : chartFallback}
      </div>

      <div className="rounded-xl bg-slate-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400">{DASHBOARD_COPY.weight}</h2>
          <button
            type="button"
            className="h-11 rounded-lg bg-slate-800 px-3 text-xs text-slate-300 active:bg-slate-700"
            onClick={() => setWeightModal(true)}
          >
            + {DASHBOARD_COPY.addWeight}
          </button>
        </div>
        {weightData && weightData.length > 0 ? (
          <Suspense fallback={chartFallback}>
            <WeightChart data={weightData} />
          </Suspense>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">{DASHBOARD_COPY.empty}</p>
        )}
      </div>

      <Link
        to="/photos"
        className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-slate-200 active:bg-slate-800"
      >
        📷 {DASHBOARD_COPY.photos}
      </Link>

      {weightModal && <WeightModal onClose={() => setWeightModal(false)} />}
    </section>
  )
}

function WeightModal({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')

  return (
    <Modal title={DASHBOARD_COPY.addWeight} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs text-slate-400">
          {SETUP_COPY.weightKg}
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={DASHBOARD_COPY.weightPlaceholder}
            className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100 placeholder:text-slate-600"
          />
        </label>
        <label className="block text-xs text-slate-400">
          {SETUP_COPY.bodyFatPct}
          <input
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg bg-slate-800 px-3 text-base text-slate-100"
          />
        </label>
        <button
          type="button"
          disabled={!(Number(weight) > 0)}
          className="h-14 w-full rounded-xl bg-orange-500 font-bold text-white active:bg-orange-600 disabled:opacity-40"
          onClick={async () => {
            await addBodyWeight(Number(weight), bodyFat ? Number(bodyFat) : undefined)
            onClose()
          }}
        >
          {SETTINGS_COPY.save}
        </button>
      </div>
    </Modal>
  )
}
