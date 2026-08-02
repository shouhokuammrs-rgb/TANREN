// 腹詳細の2軸表示(DEC-018改 spec §4)。成長タブで腹を選んだときに
// 汎用推移カードの代わりに出す。上=厚み(段位・意味色は熱)/下=薄さ(体脂肪率・熱を使わない)
import { Suspense, lazy, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ABS_CONDITIONS, PROMOTION_FROM_NAME, PROMOTION_TO_NAME } from '../constants/goals'
import { ABS_GOAL_COPY } from '../constants/copy'
import { db } from '../db/db'
import { listBodyStats, listClearedAbsConditions } from '../db/queries'
import type { AbsCondition } from '../db/types'
import { absAttained, sessionE1Rm, sessionMaxReps, type GrowthSessionInput } from '../engine'
import { BODY_FAT_CHART } from '../constants/charts'
import { AbsTierBadges } from './AbsGoalRow'

const AbsTrendChart = lazy(() =>
  import('./DashboardCharts').then((m) => ({ default: m.AbsTrendChart })),
)
const BodyFatChart = lazy(() =>
  import('./DashboardCharts').then((m) => ({ default: m.BodyFatChart })),
)

const chartFallback = <p className="py-6 text-center text-sm text-ink-dim">…</p>

function dateLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function AbsDetail({ sessions }: { sessions: GrowthSessionInput[] }) {
  const cleared = useLiveQuery(() => listClearedAbsConditions()) ?? new Set<AbsCondition>()
  const absGoal = useLiveQuery(() => db.muscle_goals.get('abs'))
  const bodyStats = useLiveQuery(listBodyStats)
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const attained = absAttained(cleared)

  // クランチ系列(§1-5): 自重=回 / 加重=kg を別系列で。切替点=加重初回セッション
  const crunchTrend = useMemo(() => {
    const entries = sessions
      .filter((s) => s.exerciseName === PROMOTION_FROM_NAME || s.exerciseName === PROMOTION_TO_NAME)
      .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime())
    const data = entries
      .map((s) => {
        const weighted = !s.bodyweight
        const value = weighted ? sessionE1Rm(s.sets) : sessionMaxReps(s.sets)
        if (value === undefined) return null
        return {
          label: dateLabel(s.performedAt),
          reps: weighted ? undefined : value,
          kg: weighted ? Math.round(value * 10) / 10 : undefined,
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
    const switchLabel = data.find((d) => d.kg !== undefined)?.label
    return { data, switchLabel, hasKg: switchLabel !== undefined }
  }, [sessions])

  // レッグレイズの状態表示(§4-1): 提案なし・頭打ち継続の1行のみ
  const legRaiseDef = ABS_CONDITIONS.find((c) => c.condition === 'C2')!
  const legRaiseMax =
    (exercises ?? []).find((e) => e.name === legRaiseDef.exerciseName)?.repRangeMax ?? 0
  const legRaiseCapped = cleared.has('C2')

  // 薄さ(§4-2): 体脂肪率未入力 or 3点未満はカードごと非表示
  const fatStats = (bodyStats ?? []).filter((s) => s.bodyFatPct !== undefined)
  const fatData = fatStats.map((s) => ({
    label: dateLabel(s.measuredAt),
    pct: s.bodyFatPct!,
  }))
  const guides = ABS_GOAL_COPY.guideLabels
  // 明示ドメイン: 目安ライン(10〜15%)を常に含める。HTMLラベルのY座標計算と共有
  const fatDomain: [number, number] = useMemo(() => {
    const values = fatData.map((d) => d.pct)
    const min = Math.floor(Math.min(...values, 10)) - 1
    const max = Math.ceil(Math.max(...values, 15)) + 1
    return [min, max]
  }, [fatData])
  const plotHeight = BODY_FAT_CHART.height - BODY_FAT_CHART.marginTop - BODY_FAT_CHART.xAxisHeight
  const guideTopPx = (pct: number) =>
    BODY_FAT_CHART.marginTop +
    (1 - (pct - fatDomain[0]) / (fatDomain[1] - fatDomain[0])) * plotHeight

  return (
    <div className="space-y-4">
      {/* 上: 厚み(段位) */}
      <div className="card-ember p-4">
        <div className="flex items-baseline justify-between">
          <span className="label-mono text-[10px] text-molten-bright">
            {ABS_GOAL_COPY.thicknessTitle}
          </span>
          <span className="label-mono text-xs font-bold tracking-normal text-text-hot">
            {attained !== null
              ? ABS_GOAL_COPY.attained(ABS_GOAL_COPY.levelLabels[attained])
              : ABS_GOAL_COPY.notAttained}
          </span>
        </div>
        {/* 段位バッジ(§2-3と同一造形・表示のみ) */}
        <div className="mt-2">
          <AbsTierBadges cleared={cleared} selectedLevel={absGoal?.level} />
        </div>

        {crunchTrend.data.length > 0 && (
          <div className="mt-3 border-t border-line-soft pt-3">
            {/* 軸ラベル(§1-5): SVG外に置く */}
            <div className="label-mono flex justify-between text-[9px] tracking-normal text-ink-dim">
              <span>{ABS_GOAL_COPY.axisLeft}</span>
              {crunchTrend.hasKg && <span>{ABS_GOAL_COPY.axisRight}</span>}
            </div>
            <Suspense fallback={chartFallback}>
              <AbsTrendChart data={crunchTrend.data} switchLabel={crunchTrend.switchLabel} />
            </Suspense>
            {crunchTrend.hasKg && (
              <p className="mt-1 text-[10px] leading-relaxed text-tab-idle">
                {ABS_GOAL_COPY.seriesSwitchNote}
              </p>
            )}
          </div>
        )}

        {/* レッグレイズの状態表示(CTA・グローなし) */}
        {legRaiseCapped && (
          <div className="mt-2 flex items-baseline justify-between border-t border-line-soft pt-2">
            <span className="text-[11px] font-bold text-ink-dim">{legRaiseDef.exerciseName}</span>
            <span className="label-mono text-[10px] tracking-normal text-tab-idle">
              {ABS_GOAL_COPY.legRaiseCapped(legRaiseDef.exerciseName, legRaiseMax).right}
            </span>
          </div>
        )}
      </div>

      {/* 下: 薄さ(体脂肪率トレンド)。card-emberより弱い枠=参考値 */}
      {fatData.length >= 3 && (
        <div className="rounded-card border border-[#241812] p-4">
          <div className="flex items-baseline justify-between">
            <span className="label-mono text-[10px] text-ink-dim">
              {ABS_GOAL_COPY.leannessTitle}
            </span>
            <span className="label-mono text-xs tracking-normal text-ink-mid">
              {fatData[fatData.length - 1].pct.toFixed(1)}%
            </span>
          </div>
          <div className="relative mt-2">
            <Suspense fallback={chartFallback}>
              <BodyFatChart data={fatData} guides={guides.map((g) => g.pct)} domain={fatDomain} />
            </Suspense>
            {/* 目安ラインのラベル(§4-3): SVG textを使わずHTMLで絶対配置・線とラベルは常にセット */}
            {guides.map((g) => (
              <span
                key={g.pct}
                className="label-mono absolute right-2 -translate-y-1/2 bg-forge-black px-1 text-[9px] tracking-normal text-ink-dim"
                style={{ top: guideTopPx(g.pct) }}
              >
                {g.label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-tab-idle">
            {ABS_GOAL_COPY.guideNote}
          </p>
        </div>
      )}
    </div>
  )
}
