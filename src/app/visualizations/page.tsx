import { createServerSupabase } from '@/lib/supabase-server'
import { format, subDays, subYears } from 'date-fns'
import NavLink from '@/components/NavLink'
import { ChevronLeft } from 'lucide-react'
import VisualizationsContent from '@/components/VisualizationsContent'

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

function getStartDate(range: TimeRange): string | null {
  const today = new Date()
  switch (range) {
    case '7d':  return format(subDays(today, 7), 'yyyy-MM-dd')
    case '30d': return format(subDays(today, 30), 'yyyy-MM-dd')
    case '90d': return format(subDays(today, 90), 'yyyy-MM-dd')
    case '1y':  return format(subYears(today, 1), 'yyyy-MM-dd')
    case 'all': return null
  }
}

export default async function VisualizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const validRanges: TimeRange[] = ['7d', '30d', '90d', '1y', 'all']
  const activeRange: TimeRange = validRanges.includes(range as TimeRange) ? (range as TimeRange) : '30d'

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const startDate = getStartDate(activeRange)
  let query = supabase
    .from('entries')
    .select('date, p_score, l_score, weight, calories, sleep_hours')
    .eq('user_id', user?.id)
    .order('date', { ascending: true })
  if (startDate) query = query.gte('date', startDate)

  const { data: entries } = await query

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-5xl mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <NavLink href="/entries" className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </NavLink>
            <h1 className="text-2xl font-semibold text-zinc-900">Visualizations</h1>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Time range selector */}
        <div className="flex items-center gap-2 mb-6">
          {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((r) => (
            <NavLink
              key={r}
              href={`/visualizations?range=${r}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeRange === r ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {r === 'all' ? 'All time' : r}
            </NavLink>
          ))}
        </div>
        <VisualizationsContent entries={entries ?? []} range={activeRange} />
      </div>
    </div>
  )
}
