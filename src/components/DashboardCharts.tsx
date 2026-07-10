// Rechartsを使うチャート群。バンドル分離のためHomePageからReact.lazyで読み込む(2-4)
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
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
