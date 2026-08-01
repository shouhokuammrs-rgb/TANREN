// 成長ビュー「熱の人体図」(DEC-011 / 4a完成版準拠)。
// 人体図(FRONT/BACK)がヒーロー。伸び率を熱の色にエンコードし、部位チップ→推移グラフ→
// フルスクリーン推移(セッション履歴付き)と掘り下げる。算出はengine/growth.tsに隔離
import { Suspense, lazy, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import BodySvg from '../components/BodySvg'
import { growthPaint } from '../components/growthPaint'
import { GROWTH_COLD, GROWTH_HEAT_SCALE, GROWTH_MIN_SESSIONS, GROWTH_PERIODS } from '../constants/charts'
import { GROWTH_COPY, MUSCLE_GOAL_COPY, MUSCLE_GROUP_LABELS } from '../constants/copy'
import { db } from '../db/db'
import { loadGrowthSessions } from '../db/queries'
import type { MuscleGroup } from '../db/types'
import {
  chartGoalLineKg,
  goalProgress,
  goalTrendByMuscle,
  muscleGrowthMap,
  targetE1Rm,
} from '../engine'

const GrowthChart = lazy(() =>
  import('../components/DashboardCharts').then((m) => ({ default: m.GrowthChart })),
)

const chartFallback = <p className="py-6 text-center text-sm text-ink-dim">…</p>
const ALL_MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

function dateLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function GrowthPage() {
  const [periodDays, setPeriodDays] = useState<number>(GROWTH_PERIODS[0])
  const [selected, setSelected] = useState<MuscleGroup | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const sessions = useLiveQuery(() => loadGrowthSessions())
  const growthMap = useMemo(
    () => muscleGrowthMap(sessions ?? [], periodDays, new Date()),
    [sessions, periodDays],
  )
  // ゴールライン+進捗軸統合(Phase 7-5b §1)
  const goals = useLiveQuery(() => db.muscle_goals.toArray())
  const profile = useLiveQuery(() => db.profiles.orderBy('id').first())
  const goalTrend = useMemo(() => goalTrendByMuscle(sessions ?? [], new Date()), [sessions])
  const maintainMuscles = useMemo(
    () => new Set((goals ?? []).filter((g) => g.mode === 'maintain').map((g) => g.muscle)),
    [goals],
  )

  // 未選択時は最も伸びている部位(データ十分のみ)を初期選択
  const current: MuscleGroup =
    selected ??
    ALL_MUSCLES.filter((m) => growthMap[m].hasEnoughData).sort(
      (a, b) => (growthMap[b].growthRate ?? 0) - (growthMap[a].growthRate ?? 0),
    )[0] ??
    'chest'
  const growth = growthMap[current]

  // 選択部位のゴール(growthモードのみライン・進捗を出す。維持は鋼色表現のみ)
  const goal = goals?.find((g) => g.muscle === current && g.mode === 'growth')
  const goalTargetKg =
    goal !== undefined ? targetE1Rm(goal.coef, profile?.weightKg ?? 58) : undefined
  // 指標乖離ルール(§1): レップ指標のグラフにはkg線を重ねない
  const goalLineKg =
    goalTargetKg !== undefined ? chartGoalLineKg(growth.metric, goalTargetKg) : undefined
  const goalProg =
    goalTargetKg !== undefined
      ? goalProgress(
          goalTrend[current]?.startE1Rm,
          goalTrend[current]?.currentE1Rm,
          goalTargetKg,
        )
      : undefined
  // レップ指標部位で進捗を出す場合は基準種目名を併記(グラフと別種目基準であることを明示)
  const goalAnchorName =
    goalProg !== undefined && growth.metric === 'reps'
      ? goalTrend[current]?.anchorExerciseName
      : undefined

  // ISS-018: 単位は指標に依存(e1RM=kg / 自重=回)
  const unitLabel = growth.metric === 'reps' ? GROWTH_COPY.repsUnit : GROWTH_COPY.e1rmUnit
  const unitSuffix = growth.metric === 'reps' ? GROWTH_COPY.repsSuffix : GROWTH_COPY.kgSuffix
  const seriesName = growth.metric === 'reps' ? GROWTH_COPY.repsSeries : GROWTH_COPY.e1rmSeries
  const chartData = growth.points.map((p) => ({ label: dateLabel(p.date), value: Math.round(p.value * 10) / 10 }))
  const latest = growth.points[growth.points.length - 1]
  // 履歴(最新順・最大6件): 前回差付き
  const history = growth.points
    .map((p, i) => ({
      date: p.date,
      value: p.value,
      diff: i > 0 ? p.value - growth.points[i - 1].value : undefined,
    }))
    .reverse()
    .slice(0, 6)

  return (
    <section className="space-y-4">
      <Link to="/" className="inline-block py-1 text-xs text-ink-dim active:text-ink-mid">
        {GROWTH_COPY.back}
      </Link>

      {/* ヘッダー: タイトル+期間セグメント(30日/90日) */}
      <header className="flex items-center justify-between">
        <div>
          <p className="label-mono text-[10px] text-accent-dim">{GROWTH_COPY.brandLabel}</p>
          <h1 className="text-[22px] font-black leading-tight text-ink">{GROWTH_COPY.title}</h1>
        </div>
        <div className="flex gap-0.5 rounded-pill border border-line-ember p-1">
          {GROWTH_PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`label-mono rounded-pill px-3.5 py-2 text-xs font-bold tracking-normal ${
                periodDays === days ? 'bg-molten text-forge-black' : 'text-ink-dim'
              }`}
            >
              {GROWTH_COPY.periodLabel(days)}
            </button>
          ))}
        </div>
      </header>

      {/* 人体図ヒーロー(FRONT/BACK)。色=月換算伸び率の熱スケール */}
      <div className="flex items-start justify-center gap-6">
        {(['front', 'back'] as const).map((side) => (
          <figure key={side} className="text-center">
            <BodySvg
              side={side}
              className="h-52 w-auto"
              paint={(m) => growthPaint(growthMap[m], m === current, maintainMuscles.has(m))}
              onPick={setSelected}
            />
            <figcaption className="label-mono mt-1 text-[9px] text-ink-dim">
              {side === 'front' ? GROWTH_COPY.sideFront : GROWTH_COPY.sideBack}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* 凡例: 月換算スケール(モックのグラデーションバー) */}
      <div className="space-y-1.5">
        <div
          className="h-2 rounded-pill"
          style={{
            background: `linear-gradient(90deg, ${GROWTH_COLD.fill}, ${[...GROWTH_HEAT_SCALE]
              .reverse()
              .map((b) => b.color)
              .join(', ')})`,
          }}
        />
        <div className="label-mono flex justify-between text-[9px] text-ink-dim">
          <span>{GROWTH_COPY.legendInsufficient}</span>
          <span>0%</span>
          <span>+6%</span>
          <span>{GROWTH_COPY.legendHigh}</span>
        </div>
      </div>

      {/* 部位チップ: 名前+実測変化率(データ不足は破線+あとn回) */}
      <div className="flex flex-wrap gap-2">
        {ALL_MUSCLES.map((m) => {
          const g = growthMap[m]
          const isSelected = m === current
          return (
            <button
              key={m}
              type="button"
              onClick={() => setSelected(m)}
              className={`flex items-baseline gap-1.5 rounded-pill border px-3.5 py-2 ${
                g.hasEnoughData ? 'border-solid' : 'border-dashed'
              } ${isSelected ? 'border-molten bg-ember-tint' : 'border-line-ember'}`}
            >
              <span className={`text-xs font-bold ${isSelected ? 'text-ink' : 'text-ink-mid'}`}>
                {MUSCLE_GROUP_LABELS[m]}
              </span>
              <span
                className={`label-mono text-[11px] font-bold tracking-normal ${
                  g.hasEnoughData ? 'text-molten-bright' : 'text-ink-dim'
                }`}
              >
                {g.hasEnoughData
                  ? GROWTH_COPY.deltaPct(g.growthRate ?? 0)
                  : GROWTH_COPY.chipNeedMore(GROWTH_MIN_SESSIONS - g.sessionCount)}
              </span>
            </button>
          )
        })}
      </div>

      {/* 推移グラフカード(タップでフルスクリーン。データ不足はタップ無効) */}
      <button
        type="button"
        disabled={!growth.hasEnoughData}
        onClick={() => setFullscreen(true)}
        className="card-ember block w-full p-4 text-left disabled:cursor-default"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="label-mono text-[10px] text-molten-bright">
            {GROWTH_COPY.chartTitle(MUSCLE_GROUP_LABELS[current])}
          </span>
          <span className="flex items-baseline gap-2.5">
            {/* 進捗軸(5b §5): カードヘッダー右に {進捗率}% ・ あと{残り}kg */}
            {goalProg && (
              <span className="label-mono text-xs font-bold tracking-normal text-[#FFE3CC]">
                {MUSCLE_GOAL_COPY.progress(Math.round(goalProg.ratio * 100), goalProg.remainingKg)}
              </span>
            )}
            {growth.hasEnoughData && (
              <span className="label-mono text-[11px] tracking-normal text-accent-dim">
                {GROWTH_COPY.expand}
              </span>
            )}
          </span>
        </div>
        {growth.anchorExerciseName && (
          <p className="mt-0.5 text-[10px] text-ink-dim">
            {GROWTH_COPY.anchorNote(growth.anchorExerciseName)}
          </p>
        )}
        {/* 指標乖離ルール(§1): レップ指標グラフの進捗はe1RM基準種目由来であることを併記 */}
        {goalAnchorName && (
          <p className="mt-0.5 text-[10px] text-ink-dim">
            {MUSCLE_GOAL_COPY.progressAnchor(goalAnchorName)}
          </p>
        )}
        {growth.hasEnoughData && latest ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num-hero glow-text text-[40px] leading-none">
                {Math.round(latest.value * 10) / 10}
              </span>
              <span className="label-mono text-[11px] tracking-normal text-accent-dim">
                {unitLabel}
              </span>
              <span className="label-mono text-sm font-bold tracking-normal text-molten-bright">
                {GROWTH_COPY.deltaPct(growth.growthRate ?? 0)}
              </span>
            </div>
            <div className="mt-2">
              <Suspense fallback={chartFallback}>
                <GrowthChart data={chartData} name={seriesName} goalLineKg={goalLineKg} />
              </Suspense>
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-chip border border-dashed border-line-ember p-4 text-center text-xs leading-relaxed text-ink-mid">
            {GROWTH_COPY.needMoreSessions(
              GROWTH_MIN_SESSIONS - growth.sessionCount,
              growth.sessionCount,
            )}
          </p>
        )}
      </button>

      {/* フルスクリーン推移(4a): 拡大グラフ+セッション履歴 */}
      {fullscreen && growth.hasEnoughData && latest && (
        <div className="anim-rise fixed inset-0 z-50 overflow-y-auto bg-forge-black px-4 pb-8 pt-6">
          <div className="mx-auto max-w-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-mono text-[10px] text-accent-dim">
                  {GROWTH_COPY.fsHeader(periodDays)}
                </p>
                <h2 className="text-2xl font-black text-ink">{MUSCLE_GROUP_LABELS[current]}</h2>
              </div>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-pill border border-line-ember text-ink-mid active:border-molten active:text-molten"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="num-hero glow-text text-[64px] leading-none">
                {Math.round(latest.value * 10) / 10}
              </span>
              <span className="label-mono text-xs tracking-normal text-accent-dim">
                {unitLabel}
              </span>
              <span className="label-mono text-[17px] font-bold tracking-normal text-molten-bright">
                {GROWTH_COPY.deltaPct(growth.growthRate ?? 0)}
              </span>
            </div>

            <div className="mt-3">
              <Suspense fallback={chartFallback}>
                <GrowthChart data={chartData} name={seriesName} height={230} goalLineKg={goalLineKg} />
              </Suspense>
            </div>

            <p className="label-mono mt-5 text-[10px] text-accent-dim">
              {GROWTH_COPY.historyTitle}
            </p>
            <ul>
              {history.map((h) => (
                <li
                  key={h.date.getTime()}
                  className="flex items-baseline justify-between border-b border-line-ember/40 py-3"
                >
                  <span className="label-mono text-xs tracking-normal text-accent-dim">
                    {dateLabel(h.date)}
                  </span>
                  <span className="flex items-baseline gap-2.5">
                    <span className="label-mono text-[15px] font-bold tracking-normal text-ink">
                      {Math.round(h.value * 10) / 10} {unitSuffix}
                    </span>
                    <span
                      className={`label-mono w-14 text-right text-xs font-bold tracking-normal ${
                        h.diff === undefined
                          ? 'text-ink-dim'
                          : h.diff >= 0
                            ? 'text-molten-bright'
                            : 'text-ink-dim'
                      }`}
                    >
                      {h.diff === undefined
                        ? '—'
                        : `${h.diff >= 0 ? '+' : ''}${Math.round(h.diff * 10) / 10}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
