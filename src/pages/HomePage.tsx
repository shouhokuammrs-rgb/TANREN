import { Suspense, lazy, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import BodySvg from '../components/BodySvg'
import FreshnessBodyMap from '../components/FreshnessBodyMap'
import { growthPaint } from '../components/growthPaint'
import Modal from '../components/Modal'
import { MUSCLE_CHART_ORDER, RECOVERY_SLOT_COLORS } from '../constants/charts'
import {
  APP_NAME,
  DASHBOARD_COPY,
  GROWTH_COPY,
  HOME_COPY,
  MUSCLE_GROUP_LABELS,
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
  loadGrowthSessions,
  setSetting,
  weeklyVolumeHistory,
} from '../db/queries'
import type { MuscleGroup } from '../db/types'
import {
  effectiveRecoveryHours,
  hoursUntilRecovered,
  muscleFreshnessMap,
  muscleGrowthMap,
  type EngineContext,
  type MuscleGrowth,
} from '../engine'
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
  const engineCtx = useLiveQuery(() => loadEngineContext())
  const freshness = engineCtx ? muscleFreshnessMap(engineCtx) : undefined
  const bodyStats = useLiveQuery(listBodyStats)
  // DEC-011: 成長カード(ミニ人体図・30日固定)
  const growthSessions = useLiveQuery(() => loadGrowthSessions())
  const growth30 = useMemo(
    () => muscleGrowthMap(growthSessions ?? [], 30, new Date()),
    [growthSessions],
  )

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

      {/* 成長カード(DEC-011/4b): ミニ人体図+上位3部位。タップで成長ビューへ */}
      <GrowthCard growth={growth30} />

      {/* CTA(§5: moltenピル+グロー)。成長カード・回復スロットより視覚優先 */}
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

      {/* 回復予測スロット(DEC-011/4b): 最下部固定。成長=熱色と混同しない鈍色表現 */}
      {engineCtx && freshness && <RecoveryForecastSlot ctx={engineCtx} freshness={freshness} />}

      {weightModal && <WeightModal onClose={() => setWeightModal(false)} />}
    </section>
  )
}

const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

/** 成長カード(DEC-011/4b): ミニ人体図(FRONT・30日固定)+上位3部位の変化率要約 */
function GrowthCard({ growth }: { growth: Record<MuscleGroup, MuscleGrowth> }) {
  const top3 = ALL_MUSCLES.filter((m) => growth[m].hasEnoughData)
    .sort((a, b) => (growth[b].growthRate ?? 0) - (growth[a].growthRate ?? 0))
    .slice(0, 3)

  return (
    <Link to="/growth" className="card-ember flex gap-4 p-4">
      <BodySvg side="front" className="h-28 w-auto shrink-0" paint={(m) => growthPaint(growth[m])} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="label-mono text-[10px] text-molten-bright">{GROWTH_COPY.cardTitle}</span>
          <span className="label-mono text-[11px] tracking-normal text-accent-dim">
            {GROWTH_COPY.cardDetail}
          </span>
        </div>
        {top3.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {top3.map((m) => (
              <div key={m} className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-ink">{MUSCLE_GROUP_LABELS[m]}</span>
                <span className="label-mono text-sm font-bold tracking-normal text-molten-bright">
                  {GROWTH_COPY.deltaPct(growth[m].growthRate ?? 0)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-ink-dim">{GROWTH_COPY.cardEmpty}</p>
        )}
      </div>
    </Link>
  )
}

/** 回復予測スロット(DEC-011/4b)。DEC-010のhoursUntilRecoveredを再利用(tuning反映込み) */
function RecoveryForecastSlot({
  ctx,
  freshness,
}: {
  ctx: EngineContext
  freshness: Record<MuscleGroup, number>
}) {
  const recovering = ALL_MUSCLES.filter((m) => freshness[m] < 100)
    .map((m) => {
      const setCount = ctx.muscleStimuli.find((s) => s.muscle === m)?.setCount ?? 0
      return {
        muscle: m,
        freshness: freshness[m],
        hours: hoursUntilRecovered(freshness[m], effectiveRecoveryHours(m, setCount, ctx.tuning)),
      }
    })
    .sort((a, b) => a.hours - b.hours)
    .slice(0, 3)

  return (
    <div className="rounded-card border border-line-ember/60 p-4">
      <p className="label-mono text-[10px] text-ink-dim">{GROWTH_COPY.recoveryTitle}</p>
      {recovering.length === 0 ? (
        <p className="mt-2 text-xs" style={{ color: RECOVERY_SLOT_COLORS.recovered }}>
          {GROWTH_COPY.recoveryAllReady}
        </p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {recovering.map((r) => (
            <div key={r.muscle} className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink-mid">
                {MUSCLE_GROUP_LABELS[r.muscle]}
              </span>
              <span className="flex items-center gap-2.5">
                <span className="h-1.5 w-28 overflow-hidden rounded-pill bg-line-ember/60">
                  <span
                    className="block h-full"
                    style={{ width: `${r.freshness}%`, background: RECOVERY_SLOT_COLORS.bar }}
                  />
                </span>
                <span
                  className="label-mono w-20 text-right text-xs tracking-normal"
                  style={{ color: RECOVERY_SLOT_COLORS.bar }}
                >
                  {r.hours < 24
                    ? GROWTH_COPY.recoveryHours(Math.max(1, Math.ceil(r.hours)))
                    : GROWTH_COPY.recoveryDays(Math.ceil(r.hours / 24))}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
