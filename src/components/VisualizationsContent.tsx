'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

interface EntryRow {
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  calories: number | null
  sleep_hours: number | null
}

interface Props {
  entries: EntryRow[]
  range: TimeRange
}

function formatXAxisDate(dateStr: string, range: TimeRange): string {
  try {
    const d = parseISO(dateStr)
    if (range === '7d') return format(d, 'EEE')
    if (range === '30d' || range === '90d') return format(d, 'MMM d')
    return format(d, "MMM ''yy")
  } catch {
    return dateStr
  }
}

function xAxisInterval(range: TimeRange): number | 'preserveStartEnd' {
  if (range === 'all' || range === '1y') return 'preserveStartEnd'
  return 0
}

interface ChartCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
  hasData: boolean
}

function ChartCard({ title, subtitle, children, hasData }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {hasData ? (
        children
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
          No data in this range
        </div>
      )}
    </div>
  )
}

export default function VisualizationsContent({ entries, range }: Props) {
  const tickFormatter = (dateStr: string) => formatXAxisDate(dateStr, range)
  const interval = xAxisInterval(range)

  const plEntries = entries.filter(e => e.p_score !== null || e.l_score !== null)
  const weightEntries = entries.filter(e => e.weight !== null)
  const sleepEntries = entries.filter(e => e.sleep_hours !== null)
  const caloriesEntries = entries.filter(e => e.calories !== null)

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* P & L Scores */}
      <ChartCard
        title="P & L Scores"
        subtitle="Daily productivity and life scores (1–10)"
        hasData={plEntries.length > 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={entries} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              interval={interval}
              tick={{ fontSize: 11, fill: '#71717a' }}
            />
            <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              labelFormatter={(label) => formatXAxisDate(String(label), range)}
              formatter={(value, name) => [value ?? '—', name === 'p_score' ? 'P Score' : 'L Score']}
            />
            <Legend formatter={(value) => value === 'p_score' ? 'P Score' : 'L Score'} />
            <Line
              type="monotone"
              dataKey="p_score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="l_score"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Weight */}
      <ChartCard
        title="Weight"
        subtitle="Daily weight (lbs)"
        hasData={weightEntries.length > 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={entries} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              interval={interval}
              tick={{ fontSize: 11, fill: '#71717a' }}
            />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              labelFormatter={(label) => formatXAxisDate(String(label), range)}
              formatter={(value) => [value ?? '—', 'Weight']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Sleep */}
      <ChartCard
        title="Sleep"
        subtitle="Hours of sleep per night"
        hasData={sleepEntries.length > 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={entries} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              interval={interval}
              tick={{ fontSize: 11, fill: '#71717a' }}
            />
            <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              labelFormatter={(label) => formatXAxisDate(String(label), range)}
              formatter={(value) => [value ?? '—', 'Sleep (hrs)']}
            />
            <Line
              type="monotone"
              dataKey="sleep_hours"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Calories */}
      <ChartCard
        title="Calories"
        subtitle="Daily calorie intake"
        hasData={caloriesEntries.length > 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={entries} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="date"
              tickFormatter={tickFormatter}
              interval={interval}
              tick={{ fontSize: 11, fill: '#71717a' }}
            />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              labelFormatter={(label) => formatXAxisDate(String(label), range)}
              formatter={(value) => [value ?? '—', 'Calories']}
            />
            <Bar dataKey="calories" fill="#f97316" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
