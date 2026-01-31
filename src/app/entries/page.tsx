import { createServerSupabase } from '@/lib/supabase-server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import EntryCard from '@/components/EntryCard'
import { Plus, Calendar as CalendarIcon, List } from 'lucide-react'

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tag_id,
        tags (
          name
        )
      )
    `)
    .eq('user_id', user?.id)
    .order('date', { ascending: false })

  const { data: allEntries } = await supabase
    .from('entries')
    .select('date')
    .eq('user_id', user?.id)

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const entriesByDate = allEntries?.reduce((acc, e) => {
    acc[e.date] = true
    return acc
  }, {} as Record<string, boolean>) || {}

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Journal</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/entries/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Link>
            <Link
              href="/entries?view=calendar"
              className={`p-2 rounded-lg transition-colors ${view === 'calendar' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}
            >
              <CalendarIcon className="w-5 h-5 text-zinc-600" />
            </Link>
            <Link
              href="/entries?view=list"
              className={`p-2 rounded-lg transition-colors ${view !== 'calendar' ? 'bg-zinc-200' : 'hover:bg-zinc-100'}`}
            >
              <List className="w-5 h-5 text-zinc-600" />
            </Link>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            Error loading entries: {error.message}
          </div>
        )}

        {view === 'calendar' ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">
              {format(today, 'MMMM yyyy')}
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-zinc-400 py-2">
                  {day}
                </div>
              ))}
              {Array(monthStart.getDay()).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {calendarDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const hasEntry = entriesByDate[dateStr]
                
                return (
                  <Link
                    key={dateStr}
                    href={hasEntry ? `/entries/${dateStr}` : `/entries/new?date=${dateStr}`}
                    className={`h-10 flex items-center justify-center rounded-lg text-sm transition-colors ${
                      isToday(day)
                        ? 'bg-zinc-900 text-white font-medium'
                        : hasEntry
                        ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {format(day, 'd')}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {entries?.map((entry) => {
              const tags = entry.entry_tags
                ?.map((et: { tags?: { name: string } | null }) => et.tags?.name)
                .filter((name: unknown): name is string => typeof name === 'string') || []
              
              return (
                <EntryCard key={entry.id} entry={entry} tags={tags} />
              )
            })}

            {entries?.length === 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-500 mb-4">No entries yet</p>
                <Link
                  href="/entries/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create your first entry
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
