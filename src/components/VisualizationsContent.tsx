'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceArea,
} from 'recharts'
import { format, parseISO, isWeekend } from 'date-fns'
import { setNavigationTarget } from '@/contexts/LoadingContext'

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

interface EntryRow {
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  calories: number | null
  sleep_hours: number | null
}

interface TagFrequencyItem {
  name: string
  count: number
}

interface Props {
  entries: EntryRow[]
  range: TimeRange
  tagFrequency: TagFrequencyItem[]
  previousPeriodEntries: EntryRow[]
}

// --- Helpers ---

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

function formatFullDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function xAxisInterval(range: TimeRange, dataLength: number): number {
  if (range === '7d') return 0
  if (range === '30d') return Math.max(1, Math.floor(dataLength / 10) - 1)
  if (range === '90d') return Math.max(1, Math.floor(dataLength / 10) - 1)
  // 1y and all: aim for ~10-12 labels
  return Math.max(1, Math.floor(dataLength / 12) - 1)
}

function computeWeekendBands(entries: { date: string }[]): { start: string; end: string }[] {
  const bands: { start: string; end: string }[] = []
  let bandStart: string | null = null

  for (const entry of entries) {
    try {
      const d = parseISO(entry.date)
      if (isWeekend(d)) {
        if (!bandStart) bandStart = entry.date
      } else {
        if (bandStart) {
          bands.push({ start: bandStart, end: entries[entries.indexOf(entry) - 1]?.date ?? bandStart })
          bandStart = null
        }
      }
    } catch {
      // skip invalid dates
    }
  }
  // Close any trailing weekend band
  if (bandStart) {
    bands.push({ start: bandStart, end: entries[entries.length - 1]?.date ?? bandStart })
  }
  return bands
}

function computeMovingAverage(
  entries: EntryRow[],
  field: keyof EntryRow,
  window = 7
): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < entries.length; i++) {
    const windowSlice = entries.slice(Math.max(0, i - window + 1), i + 1)
    const values = windowSlice
      .map(e => e[field] as number | null)
      .filter((v): v is number => v !== null)
    result.push(values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null)
  }
  return result
}

function computeStats(entries: EntryRow[]) {
  const avg = (field: keyof EntryRow) => {
    const vals = entries.map(e => e[field] as number | null).filter((v): v is number => v !== null)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  const weights = entries.map(e => e.weight).filter((v): v is number => v !== null)
  const weightDelta = weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null

  return {
    avgP: avg('p_score'),
    avgL: avg('l_score'),
    avgSleep: avg('sleep_hours'),
    avgCalories: avg('calories'),
    weightDelta,
  }
}

type MetricKey = 'p_score' | 'l_score' | 'sleep_hours' | 'weight' | 'calories'

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'p_score', label: 'P Score' },
  { key: 'l_score', label: 'L Score' },
  { key: 'sleep_hours', label: 'Sleep' },
  { key: 'weight', label: 'Weight' },
  { key: 'calories', label: 'Calories' },
]

const METRIC_COLORS: Record<string, string> = {
  p_score: '#3b82f6',
  l_score: '#10b981',
  weight: '#8b5cf6',
  sleep_hours: '#f59e0b',
  calories: '#f97316',
}

const METRIC_LABELS: Record<string, string> = {
  p_score: 'P Score',
  l_score: 'L Score',
  weight: 'Weight',
  sleep_hours: 'Sleep (hrs)',
  calories: 'Calories',
}

// --- Components ---

interface ChartCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
  hasData: boolean
  className?: string
}

function ChartCard({ title, subtitle, children, hasData, className }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-zinc-200 p-6 ${className ?? ''}`}>
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

function StatCard({
  label,
  value,
  unit,
  change,
  neutralColor,
}: {
  label: string
  value: string | null
  unit?: string
  change: number | null
  neutralColor?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-xl font-semibold text-zinc-900">
        {value !== null ? `${value}${unit ?? ''}` : '—'}
      </span>
      {change !== null && (
        <span className={`text-xs font-medium ${
          neutralColor
            ? 'text-zinc-500'
            : change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-zinc-400'
        }`}>
          {change > 0 ? '↑' : change < 0 ? '↓' : '—'}{' '}
          {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: EntryRow }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0]?.payload
  if (!data?.date) return null

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-lg p-3 text-sm">
      <div className="font-medium text-zinc-900 mb-1.5">{formatFullDate(data.date)}</div>
      {data.p_score != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.p_score }} />
          <span className="text-zinc-600">P Score: {data.p_score}</span>
        </div>
      )}
      {data.l_score != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.l_score }} />
          <span className="text-zinc-600">L Score: {data.l_score}</span>
        </div>
      )}
      {data.sleep_hours != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.sleep_hours }} />
          <span className="text-zinc-600">Sleep: {data.sleep_hours}hrs</span>
        </div>
      )}
      {data.weight != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.weight }} />
          <span className="text-zinc-600">Weight: {data.weight}</span>
        </div>
      )}
      {data.calories != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METRIC_COLORS.calories }} />
          <span className="text-zinc-600">Calories: {data.calories}</span>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export default function VisualizationsContent({ entries, range, tagFrequency, previousPeriodEntries }: Props) {
  const router = useRouter()
  const [scatterX, setScatterX] = useState<MetricKey>('p_score')
  const [scatterY, setScatterY] = useState<MetricKey>('sleep_hours')

  const tickFormatter = (dateStr: string) => formatXAxisDate(dateStr, range)
  const interval = xAxisInterval(range, entries.length)
  const weekendBands = computeWeekendBands(entries)

  // Enriched data with moving averages
  const pMa = computeMovingAverage(entries, 'p_score')
  const lMa = computeMovingAverage(entries, 'l_score')
  const weightMa = computeMovingAverage(entries, 'weight')
  const sleepMa = computeMovingAverage(entries, 'sleep_hours')

  const enrichedData = entries.map((e, i) => ({
    ...e,
    p_score_ma: pMa[i],
    l_score_ma: lMa[i],
    weight_ma: weightMa[i],
    sleep_hours_ma: sleepMa[i],
  }))

  const plEntries = entries.filter(e => e.p_score !== null || e.l_score !== null)
  const weightEntries = entries.filter(e => e.weight !== null)
  const sleepEntries = entries.filter(e => e.sleep_hours !== null)
  const caloriesEntries = entries.filter(e => e.calories !== null)

  // Stats
  const currentStats = computeStats(entries)
  const prevStats = computeStats(previousPeriodEntries)
  const hasPrevPeriod = previousPeriodEntries.length > 0

  function pctChange(current: number | null, prev: number | null): number | null {
    if (current === null || prev === null || prev === 0) return null
    return Math.round(((current - prev) / Math.abs(prev)) * 1000) / 10
  }

  function handleDotClick(date: string) {
    setNavigationTarget(`/entries/${date}`)
    router.push(`/entries/${date}`)
  }

  const handleLineChartClick = (state: Record<string, unknown> | null) => {
    const activePayload = state?.activePayload as { payload: { date: string } }[] | undefined
    if (activePayload?.[0]?.payload?.date) {
      handleDotClick(activePayload[0].payload.date)
    }
  }

  // Scatter data
  const scatterData = entries
    .filter(e => e[scatterX] !== null && e[scatterY] !== null)
    .map(e => ({
      x: e[scatterX] as number,
      y: e[scatterY] as number,
      date: e.date,
    }))

  const tooltipContent = <CustomTooltip />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Stats */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Avg P Score"
          value={currentStats.avgP?.toString() ?? null}
          change={hasPrevPeriod ? pctChange(currentStats.avgP, prevStats.avgP) : null}
        />
        <StatCard
          label="Avg L Score"
          value={currentStats.avgL?.toString() ?? null}
          change={hasPrevPeriod ? pctChange(currentStats.avgL, prevStats.avgL) : null}
        />
        <StatCard
          label="Avg Sleep"
          value={currentStats.avgSleep?.toString() ?? null}
          unit="hrs"
          change={hasPrevPeriod ? pctChange(currentStats.avgSleep, prevStats.avgSleep) : null}
        />
        <StatCard
          label="Avg Calories"
          value={currentStats.avgCalories?.toString() ?? null}
          change={hasPrevPeriod ? pctChange(currentStats.avgCalories, prevStats.avgCalories) : null}
        />
        <StatCard
          label="Weight Delta"
          value={currentStats.weightDelta !== null ? `${currentStats.weightDelta > 0 ? '+' : ''}${currentStats.weightDelta}` : null}
          unit=" lbs"
          change={hasPrevPeriod ? pctChange(currentStats.weightDelta, prevStats.weightDelta) : null}
          neutralColor
        />
      </div>

      {/* P & L Scores */}
      <ChartCard
        title="P & L Scores"
        subtitle="Daily productivity and life scores (1-10)"
        hasData={plEntries.length > 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={enrichedData} margin={{ top: 4, right: 8, bottom: range !== '7d' ? 16 : 0, left: -16 }} onClick={handleLineChartClick} style={{ cursor: 'pointer' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            {weekendBands.map((band, i) => (
              <ReferenceArea key={i} x1={band.start} x2={band.end} fill="#f4f4f5" fillOpacity={0.8} ifOverflow="hidden" />
            ))}
            <XAxis dataKey="date" tickFormatter={tickFormatter} interval={interval} tick={{ fontSize: 11, fill: '#71717a' }} angle={range !== '7d' ? -35 : 0} textAnchor={range !== '7d' ? 'end' : 'middle'} />
            <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={tooltipContent} />
            <Legend formatter={(value: string) => METRIC_LABELS[value] ?? value} />
            <Line type="monotone" dataKey="p_score" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="l_score" stroke="#10b981" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="p_score_ma" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls legendType="none" />
            <Line type="monotone" dataKey="l_score_ma" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls legendType="none" />
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
          <LineChart data={enrichedData} margin={{ top: 4, right: 8, bottom: range !== '7d' ? 16 : 0, left: -16 }} onClick={handleLineChartClick} style={{ cursor: 'pointer' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            {weekendBands.map((band, i) => (
              <ReferenceArea key={i} x1={band.start} x2={band.end} fill="#f4f4f5" fillOpacity={0.8} ifOverflow="hidden" />
            ))}
            <XAxis dataKey="date" tickFormatter={tickFormatter} interval={interval} tick={{ fontSize: 11, fill: '#71717a' }} angle={range !== '7d' ? -35 : 0} textAnchor={range !== '7d' ? 'end' : 'middle'} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={tooltipContent} />
            <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="weight_ma" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls legendType="none" />
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
          <LineChart data={enrichedData} margin={{ top: 4, right: 8, bottom: range !== '7d' ? 16 : 0, left: -16 }} onClick={handleLineChartClick} style={{ cursor: 'pointer' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            {weekendBands.map((band, i) => (
              <ReferenceArea key={i} x1={band.start} x2={band.end} fill="#f4f4f5" fillOpacity={0.8} ifOverflow="hidden" />
            ))}
            <XAxis dataKey="date" tickFormatter={tickFormatter} interval={interval} tick={{ fontSize: 11, fill: '#71717a' }} angle={range !== '7d' ? -35 : 0} textAnchor={range !== '7d' ? 'end' : 'middle'} />
            <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={tooltipContent} />
            <Line type="monotone" dataKey="sleep_hours" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="sleep_hours_ma" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls legendType="none" />
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
          <BarChart data={entries} margin={{ top: 4, right: 8, bottom: range !== '7d' ? 16 : 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            {weekendBands.map((band, i) => (
              <ReferenceArea key={i} x1={band.start} x2={band.end} fill="#f4f4f5" fillOpacity={0.8} ifOverflow="hidden" />
            ))}
            <XAxis dataKey="date" tickFormatter={tickFormatter} interval={interval} tick={{ fontSize: 11, fill: '#71717a' }} angle={range !== '7d' ? -35 : 0} textAnchor={range !== '7d' ? 'end' : 'middle'} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip content={tooltipContent} />
            <Bar
              dataKey="calories"
              fill="#f97316"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
              onClick={(data) => {
                const date = (data as unknown as { date?: string })?.date
                if (date) handleDotClick(date)
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Correlation Scatter Plot */}
      <ChartCard
        title="Correlations"
        subtitle="Compare any two metrics"
        hasData={scatterData.length > 0}
        className="lg:col-span-2"
      >
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-zinc-600">
            X:
            <select
              className="ml-1.5 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              value={scatterX}
              onChange={e => setScatterX(e.target.value as MetricKey)}
            >
              {METRIC_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-600">
            Y:
            <select
              className="ml-1.5 rounded-md border border-zinc-300 px-2 py-1 text-sm"
              value={scatterY}
              onChange={e => setScatterY(e.target.value as MetricKey)}
            >
              {METRIC_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
        </div>
        {scatterX === scatterY ? (
          <div className="h-48 flex items-center justify-center text-sm text-zinc-400">
            Select two different metrics to compare
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                type="number"
                dataKey="x"
                name={METRIC_OPTIONS.find(m => m.key === scatterX)?.label}
                tick={{ fontSize: 11, fill: '#71717a' }}
                label={{ value: METRIC_OPTIONS.find(m => m.key === scatterX)?.label, position: 'insideBottom', offset: -2, fontSize: 11, fill: '#71717a' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={METRIC_OPTIONS.find(m => m.key === scatterY)?.label}
                tick={{ fontSize: 11, fill: '#71717a' }}
                label={{ value: METRIC_OPTIONS.find(m => m.key === scatterY)?.label, angle: -90, position: 'insideLeft', offset: 20, fontSize: 11, fill: '#71717a' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as { x: number; y: number; date: string }
                  return (
                    <div className="bg-white rounded-lg border border-zinc-200 shadow-lg p-3 text-sm">
                      <div className="font-medium text-zinc-900 mb-1">{formatFullDate(d.date)}</div>
                      <div className="text-zinc-600">{METRIC_OPTIONS.find(m => m.key === scatterX)?.label}: {d.x}</div>
                      <div className="text-zinc-600">{METRIC_OPTIONS.find(m => m.key === scatterY)?.label}: {d.y}</div>
                    </div>
                  )
                }}
              />
              <Scatter
                data={scatterData}
                fill="#6366f1"
                fillOpacity={0.6}
                cursor="pointer"
                onClick={(point: { date: string }) => handleDotClick(point.date)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Tag Frequency */}
      <ChartCard
        title="Tag Frequency"
        subtitle="Most used tags in this period"
        hasData={tagFrequency.length > 0}
      >
        <ResponsiveContainer width="100%" height={Math.max(200, tagFrequency.length * 28)}>
          <BarChart data={tagFrequency} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} width={80} />
            <Tooltip
              formatter={(value) => [value, 'Entries']}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
