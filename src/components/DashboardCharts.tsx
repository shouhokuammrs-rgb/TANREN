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
import { MUSCLE_CHART_COLORS, MUSCLE_CHART_ORDER } from '../constants/charts'
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
