import { Suspense, lazy, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import FreshnessBodyMap from '../components/FreshnessBodyMap'
import Modal from '../components/Modal'
import { MUSCLE_CHART_ORDER } from '../constants/charts'
import {
  APP_NAME,
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
  dailyVolumeHistory,
  getSetting,
  homeStats,
  listBodyStats,
  loadEngineContext,
  loadGoal,
  setSetting,
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

const chartFallback = <p className="py-6 text-center text-sm text-ink-dim">…</p>

export default function HomePage() {
  const [bannerDismissed, setBannerDismissed] = useLocalSetting('setupBannerDismissed', false)
  const [weightModal, setWeightModal] = useState(false)

  const goal = useLiveQuery(async () => (await loadGoal()) ?? null)
  const exportReminder = useLiveQuery(async () => {
    const hasData = (await db.sessions.count()) > 0
    return { show: shouldRemindExport(lastExportAt(), hasData), never: lastExportAt() === null }
  })
  const stats = useLiveQuery(() => homeStats())
  // ISS-012: 週/日切り替え。選択はDexieのsettingsに保存(バックアップにも含まれる)
  const chartMode = useLiveQuery(() => getSetting<'day' | 'week'>('volumeChartMode', 'day'), [], 'day')
  const volumeHistory = useLiveQuery(
    () => (chartMode === 'week' ? weeklyVolumeHistory() : dailyVolumeHistory()),
    [chartMode],
  )
  const freshness = useLiveQuery(async () => muscleFreshnessMap(await loadEngineContext()))
  const bodyStats = useLiveQuery(listBodyStats)

  const volumeData = volumeHistory?.map((p) => {
    const row: Record<string, number | string> = { label: p.weekLabel }
    for (const m of MUSCLE_CHART_ORDER) row[m] = p.sets[m] ?? 0
    return row
  })
  const hasVolume = volumeHistory?.some((p) => Object.keys(p.sets).length > 0) ?? false

  const weightData = bodyStats?.map((s) => ({
    date: formatDate(s.measuredAt).split(' ')[0],
    weightKg: s.weightKg,
  }))

  const now = new Date()

  return (
    <section className="space-y-5">
      {/* ヘッダー(§5): ワードマーク+日付 */}
      <header className="flex items-baseline justify-between">
        <span className="label-mono text-[12px] font-bold text-molten">{APP_NAME}</span>
        <span className="label-mono text-[11px] tracking-normal text-ink-dim">
          {now.getMonth() + 1}/{now.getDate()}
        </span>
      </header>

      {/* 挨拶見出し(Noto 900 30px・2行) */}
      <h1 className="text-[30px] font-black leading-tight text-ink">
        {HOME_COPY.greeting[0]}
        <br />
        {HOME_COPY.greeting[1]}
      </h1>

      {goal === null && !bannerDismissed && (
        <div className="card-ember p-3">
          <p className="text-sm text-ink-mid">{SETUP_COPY.banner}</p>
          <div className="mt-2 flex gap-2">
            <Link
              to="/setup"
              className="pill-molten flex h-11 flex-1 items-center justify-center text-sm"
            >
              {SETUP_COPY.bannerCta}
            </Link>
            <button
              type="button"
              className="pill-ghost h-11 px-4 text-sm"
              onClick={() => setBannerDismissed(true)}
            >
              {SETUP_COPY.bannerSkip}
            </button>
          </div>
        </div>
      )}

      {/* 統計カード×2(§5: 数字 Anton 40px+グロー) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-ember px-4 py-3">
          <p className="label-mono text-[10px] text-accent-dim">{HOME_COPY.statStreak}</p>
          <p className="num-hero glow-text mt-1 text-[40px] leading-none">
            {stats?.streakDays ?? 0}
            <span className="ml-1 text-sm text-accent-dim">{HOME_COPY.statStreakUnit}</span>
          </p>
        </div>
        <div className="card-ember px-4 py-3">
          <p className="label-mono text-[10px] text-accent-dim">{HOME_COPY.statWeeklyVolume}</p>
          <p className="num-hero glow-text mt-1 text-[40px] leading-none">
            {(stats?.weeklyVolumeKg ?? 0).toLocaleString()}
            <span className="ml-1 text-sm text-accent-dim">{HOME_COPY.statWeeklyVolumeUnit}</span>
          </p>
        </div>
      </div>

      {/* CTA(§5: moltenピル+グロー) */}
      <Link
        to="/workout"
        className="pill-molten flex h-16 w-full items-center justify-center text-[17px]"
      >
        {HOME_COPY.startCta}
      </Link>

      {exportReminder?.show && (
        <div className="card-ember flex items-center justify-between gap-2 p-3 text-xs text-ink-mid">
          <span>💾 {exportReminder.never ? STORAGE_COPY.reminderNever : STORAGE_COPY.reminder}</span>
          <Link to="/settings" className="pill-ghost shrink-0 px-3 py-2 text-xs">
            {STORAGE_COPY.reminderCta}
          </Link>
        </div>
      )}

      <div className="card-ember p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="label-mono text-[10px] text-accent-dim">
            {DASHBOARD_COPY.weeklyVolume}
          </h2>
          {/* ISS-012: 週/日切り替えタブ(デフォルト=日) */}
          <div className="flex gap-1">
            {(['day', 'week'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => void setSetting('volumeChartMode', mode)}
                className={`h-11 rounded-chip px-4 text-xs font-bold ${
                  chartMode === mode ? 'bg-molten text-white' : 'bg-line-ember/40 text-ink-mid'
                }`}
              >
                {mode === 'day' ? DASHBOARD_COPY.chartModeDay : DASHBOARD_COPY.chartModeWeek}
              </button>
            ))}
          </div>
        </div>
        {hasVolume && volumeData ? (
          <Suspense fallback={chartFallback}>
            <VolumeChart data={volumeData} />
          </Suspense>
        ) : (
          <p className="py-6 text-center text-sm text-ink-dim">{DASHBOARD_COPY.empty}</p>
        )}
      </div>

      <div className="card-ember p-4">
        <h2 className="label-mono mb-2 text-[10px] text-accent-dim">{DASHBOARD_COPY.freshness}</h2>
        {freshness ? <FreshnessBodyMap freshness={freshness} /> : chartFallback}
      </div>

      <div className="card-ember p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="label-mono text-[10px] text-accent-dim">{DASHBOARD_COPY.weight}</h2>
          <button
            type="button"
            className="pill-ghost h-11 px-3 text-xs"
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
          <p className="py-6 text-center text-sm text-ink-dim">{DASHBOARD_COPY.empty}</p>
        )}
      </div>

      <Link
        to="/photos"
        className="pill-ghost flex h-12 w-full items-center justify-center text-sm"
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
        <label className="block text-xs text-ink-mid">
          {SETUP_COPY.weightKg}
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={DASHBOARD_COPY.weightPlaceholder}
            className="mt-1 h-12 w-full rounded-chip border border-line-ember bg-transparent px-3 text-base text-ink placeholder:text-ink-dim"
          />
        </label>
        <label className="block text-xs text-ink-mid">
          {SETUP_COPY.bodyFatPct}
          <input
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            className="mt-1 h-12 w-full rounded-chip border border-line-ember bg-transparent px-3 text-base text-ink"
          />
        </label>
        <button
          type="button"
          disabled={!(Number(weight) > 0)}
          className="pill-molten h-14 w-full text-[16px] disabled:opacity-40"
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
