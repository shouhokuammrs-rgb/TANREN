// Rechartsを使うチャート群。バンドル分離のためHomePageからReact.lazyで読み込む(2-4)
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BODY_FAT_CHART, MUSCLE_CHART_COLORS, MUSCLE_CHART_ORDER } from '../constants/charts'
import { MUSCLE_GROUP_LABELS } from '../constants/copy'

const AXIS_TICK = { fill: '#8a5a3c', fontSize: 11 }
const TOOLTIP_STYLE = {
  background: '#241812',
  border: 'none',
  borderRadius: 8,
  fontSize: 12,
} as const

export function VolumeChart({ data }: { data: Record<string, number | string>[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#241812" vertical={false} />
        {/* ISS-012: 週別/日別どちらの集計でも使うため軸キーはlabelに統一 */}
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#d9cfc6' }}
          cursor={{ fill: '#3a221355' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        {MUSCLE_CHART_ORDER.map((m) => (
          <Bar
            key={m}
            dataKey={m}
            stackId="sets"
            name={MUSCLE_GROUP_LABELS[m]}
            fill={MUSCLE_CHART_COLORS[m]}
            stroke="#0b0907"
            strokeWidth={2}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** ゴールライン右端の値タグ(5b §5: #FFE3CC塗り・角丸3px・Mono 700 10px #0B0907) */
function GoalLineTag({
  viewBox,
  valueKg,
}: {
  viewBox?: { x?: number; y?: number; width?: number }
  valueKg?: number
}) {
  if (!viewBox || valueKg === undefined) return null
  const text = `${valueKg}`
  const w = text.length * 6.5 + 9
  const x = (viewBox.x ?? 0) + (viewBox.width ?? 0) - w
  const y = (viewBox.y ?? 0) - 7
  return (
    <g>
      <rect x={x} y={y} width={w} height={14} rx={3} fill="#FFE3CC" />
      <text
        x={x + w / 2}
        y={y + 10}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fill="#0B0907"
        style={{ fontFamily: 'var(--font-label)' }}
      >
        {text}
      </text>
    </g>
  )
}

/** 成長推移(DEC-011/ISS-018)。データ点=セッション。値はe1RM(kg)または最大レップ(回) */
export function GrowthChart({
  data,
  name,
  height = 150,
  goalLineKg,
}: {
  data: { label: string; value: number }[]
  name: string
  height?: number
  /** ゴールライン(Phase 7-5b §1)。レップ指標の部位ではundefinedを渡す(kg線を重ねない) */
  goalLineKg?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="#241812" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          domain={[
            (dataMin: number) => Math.floor(Math.min(dataMin, goalLineKg ?? dataMin) - 2),
            (dataMax: number) => Math.ceil(Math.max(dataMax, goalLineKg ?? dataMax) + 2),
          ]}
          tickFormatter={(v: number) => `${Math.round(v)}`}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d9cfc6' }} />
        {goalLineKg !== undefined && (
          <ReferenceLine
            y={goalLineKg}
            stroke="#FFE3CC"
            strokeWidth={1.5}
            label={<GoalLineTag valueKg={goalLineKg} />}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke="#FF5C1A"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#FFE3CC', stroke: '#0b0907', strokeWidth: 1.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * 腹詳細のクランチ系列(DEC-017改 §1-5)。回(自重)とkg(加重)を別系列・別Y軸で描き、
 * 切替セッション位置に縦の破線を置く(同一線で繋ぐと誤読を生むため)
 */
export function AbsTrendChart({
  data,
  switchLabel,
  height = 150,
}: {
  data: { label: string; reps?: number; kg?: number }[]
  /** 加重初回セッションのX位置(切替の縦破線)。加重データなしならundefined */
  switchLabel?: string
  height?: number
}) {
  const hasKg = data.some((d) => d.kg !== undefined)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: hasKg ? 0 : 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="#241812" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis yAxisId="reps" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        {hasKg && (
          <YAxis
            yAxisId="kg"
            orientation="right"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={32}
          />
        )}
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d9cfc6' }} />
        {switchLabel !== undefined && (
          <ReferenceLine
            x={switchLabel}
            yAxisId="reps"
            stroke="#3A2213"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        {/* 回の系列: 過去の参考として残すが主役から降ろす(ドットなし) */}
        <Line
          yAxisId="reps"
          type="monotone"
          dataKey="reps"
          name="回"
          stroke="#8A5A3C"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        {hasKg && (
          <Line
            yAxisId="kg"
            type="monotone"
            dataKey="kg"
            name="kg"
            stroke="#FF5C1A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#FFE3CC', stroke: '#0b0907', strokeWidth: 1.5 }}
            style={{ filter: 'drop-shadow(0 0 6px rgb(255 92 26/.5))' }}
            connectNulls={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * 体脂肪率トレンド(DEC-018 §4-2/4-3)。溶鉄を使わない(成長の熱スケールに載せない)。
 * 目安ラインは破線のみ描き、ラベルはSVG外のHTMLで重ねる(呼び出し側で絶対配置)
 */
export function BodyFatChart({
  data,
  guides,
  domain,
}: {
  data: { label: string; pct: number }[]
  guides: number[]
  /** 明示ドメイン(HTMLラベルのY座標計算と一致させるため固定値で渡す) */
  domain: [number, number]
}) {
  return (
    <ResponsiveContainer width="100%" height={BODY_FAT_CHART.height}>
      <LineChart
        data={data}
        margin={{ top: BODY_FAT_CHART.marginTop, right: 8, left: -14, bottom: 0 }}
      >
        <CartesianGrid stroke="#241812" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          height={BODY_FAT_CHART.xAxisHeight}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          domain={domain}
          tickFormatter={(v: number) => `${Math.round(v)}`}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d9cfc6' }} />
        {guides.map((pct) => (
          <ReferenceLine
            key={pct}
            y={pct}
            stroke="#8A5A3C"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.7}
          />
        ))}
        <Line
          type="monotone"
          dataKey="pct"
          name="体脂肪率(%)"
          stroke="#D9CFC6"
          strokeWidth={2}
          dot={{ r: 3.5, fill: '#D9CFC6', stroke: '#0b0907', strokeWidth: 1.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function WeightChart({ data }: { data: { date: string; weightKg?: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="#241812" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d9cfc6' }} />
        <Line
          type="monotone"
          dataKey="weightKg"
          name="体重(kg)"
          stroke="#3987e5"
          strokeWidth={2}
          dot={{ r: 4, fill: '#3987e5', stroke: '#0b0907', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
