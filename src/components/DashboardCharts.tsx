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

const AXIS_TICK = { fill: '#94a3b8', fontSize: 11 }
const TOOLTIP_STYLE = {
  background: '#1e293b',
  border: 'none',
  borderRadius: 8,
  fontSize: 12,
} as const

export function VolumeChart({ data }: { data: Record<string, number | string>[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#e2e8f0' }}
          cursor={{ fill: '#33415555' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        {MUSCLE_CHART_ORDER.map((m) => (
          <Bar
            key={m}
            dataKey={m}
            stackId="sets"
            name={MUSCLE_GROUP_LABELS[m]}
            fill={MUSCLE_CHART_COLORS[m]}
            stroke="#0f172a"
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
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
        <Line
          type="monotone"
          dataKey="weightKg"
          name="体重(kg)"
          stroke="#3987e5"
          strokeWidth={2}
          dot={{ r: 4, fill: '#3987e5', stroke: '#0f172a', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
