import { createServerSupabase } from '@/lib/supabase-server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns'
import Link from 'next/link'
import NavLink from '@/components/NavLink'
import LogoutButton from '@/components/LogoutButton'
import EntryCard from '@/components/EntryCard'
import MissingDayCard from '@/components/MissingDayCard'
import EntriesContent from '@/components/EntriesContent'
import { Plus, Calendar as CalendarIcon, List, Search, BarChart3, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle } from 'lucide-react'

const PAGE_SIZE = 10
const DEFAULT_TIMEZONE = 'America/Los_Angeles'

// Get current date in a specific timezone
function getTodayInTimezone(timezone: string): Date {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
  return new Date(dateStr + 'T00:00:00')
}

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; tag?: string; from?: string; to?: string; page?: string; month?: string; year?: string; incomplete?: string }> }) {
  const { view, q, tag, from, to, page, month, year, incomplete } = await searchParams
  const currentPage = parseInt(page || '1')
  const offset = (currentPage - 1) * PAGE_SIZE
  
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's timezone preference
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('timezone')
    .eq('user_id', user?.id)
    .single()

  const userTimezone = preferences?.timezone || DEFAULT_TIMEZONE

  // Calendar month/year from URL or default to current
  // Use user's timezone to avoid server timezone issues
  const today = getTodayInTimezone(userTimezone)
  const calendarYear = year ? parseInt(year) : today.getFullYear()
  const calendarMonth = month ? parseInt(month) - 1 : today.getMonth()
  const calendarDate = new Date(calendarYear, calendarMonth, 1)

  const monthStart = startOfMonth(calendarDate)
  const monthEnd = endOfMonth(calendarDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Navigation dates
  const prevMonth = subMonths(calendarDate, 1)
  const nextMonth = addMonths(calendarDate, 1)
  const prevYear = new Date(calendarYear - 1, calendarMonth, 1)
  const nextYear = new Date(calendarYear + 1, calendarMonth, 1)

  // Build entries query with filters
  let entriesQuery = supabase
    .from('entries')
    .select(`
      id, date, p_score, l_score, weight,
      entry_tags (tags (name))
    `, { count: 'exact' })
    .eq('user_id', user?.id)

  // Apply filters (but NOT incomplete - we handle that separately)
  if (q) {
    entriesQuery = entriesQuery.or(`highlights_high.ilike.%${q}%,highlights_low.ilike.%${q}%,morning.ilike.%${q}%,afternoon.ilike.%${q}%,night.ilike.%${q}%`)
  }
  if (tag) {
    entriesQuery = entriesQuery.eq('entry_tags.tags.name', tag)
  }
  if (from) entriesQuery = entriesQuery.gte('date', from)
  if (to) entriesQuery = entriesQuery.lte('date', to)
  // Only apply incomplete filter to DB query if not active (we handle it in JS for missing days)
  if (incomplete) entriesQuery = entriesQuery.eq('complete', false)

  // Run all queries in parallel for better performance
  const [entriesResult, analyticsResult, calendarResult] = await Promise.all([
    // Paginated entries query (only when NOT using incomplete filter, since we paginate differently)
    incomplete
      ? Promise.resolve({ data: null, count: null })
      : entriesQuery
          .order('date', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1),
    // Analytics query (on first page OR when incomplete filter is active)
    currentPage === 1 || incomplete
      ? supabase
          .from('entries')
          .select('date, highlights_high, highlights_low, id, p_score, l_score, weight')
          .eq('user_id', user?.id)
      : Promise.resolve({ data: null }),
    // Calendar entries query - fetch highlights to determine completeness based on content
    supabase
      .from('entries')
      .select('date, highlights_high, highlights_low')
      .eq('user_id', user?.id)
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'))
  ])

  const { data: entriesData, count } = entriesResult
  const { data: allEntries } = analyticsResult
  const { data: calendarEntries } = calendarResult

  // Build incomplete days list when incomplete filter is active
  let incompleteDays: Array<{ date: string; type: 'missing' | 'incomplete'; entry?: any }> = []
  let incompleteTotalCount = 0

  if (incomplete && allEntries) {
    const startDate = new Date('2024-09-01T00:00:00')
    const todayDate = new Date(format(today, 'yyyy-MM-dd') + 'T00:00:00')
    const entryDates = new Set(allEntries.map(e => e.date))
    // Check if entry has content (highs OR lows)
    const hasContentMap = new Map(allEntries.map(e => [e.date, !!(e.highlights_high || e.highlights_low)]))
    const entriesByDate = new Map(allEntries.map(e => [e.date, e]))

    const allIncompleteDays: typeof incompleteDays = []

    for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd')
      if (!entryDates.has(dateStr)) {
        allIncompleteDays.push({ date: dateStr, type: 'missing' })
      } else if (!hasContentMap.get(dateStr)) {
        allIncompleteDays.push({ date: dateStr, type: 'incomplete', entry: entriesByDate.get(dateStr) })
      }
    }

    // Sort descending (most recent first)
    allIncompleteDays.sort((a, b) => b.date.localeCompare(a.date))
    incompleteTotalCount = allIncompleteDays.length

    // Paginate
    incompleteDays = allIncompleteDays.slice(offset, offset + PAGE_SIZE)
  }

  const totalCount = incomplete ? incompleteTotalCount : (count || 0)

  // Derive everything from entries query
  const entries = entriesData?.map((e: any) => ({
    ...e,
    entry_tags: e.entry_tags?.map((et: any) => ({ tags: et.tags }))
  })) || []

  // Calculate analytics
  let analytics: any = null
  if (currentPage === 1 && allEntries && allEntries.length > 0) {
    const todayStr = format(today, 'yyyy-MM-dd')

    // Create a set of dates with entries and a map for content status (has highs OR lows)
    const entryDates = new Set(allEntries.map(e => e.date))
    const hasContentMap = new Map(allEntries.map(e => [e.date, !!(e.highlights_high || e.highlights_low)]))

    // Count incomplete days (no entry or entry missing both highs and lows) from Sept 1, 2024 to today
    let incompleteDays = 0
    const currentDate = new Date('2024-09-01T00:00:00')
    const todayDate = new Date(todayStr + 'T00:00:00')

    while (currentDate <= todayDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      if (!entryDates.has(dateStr) || !hasContentMap.get(dateStr)) {
        incompleteDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    analytics = { totalEntries: allEntries.length, incompleteDays }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Helper to build calendar nav URL
  const calendarUrl = (date: Date) =>
    `/entries?view=calendar&month=${date.getMonth() + 1}&year=${date.getFullYear()}`

  const isCurrentMonth = calendarMonth === today.getMonth() && calendarYear === today.getFullYear()

  // Show list view when any filter is active
  const hasActiveFilters = !!(q || tag || from || to || incomplete)
  const effectiveView = hasActiveFilters ? 'list' : view

  // Map entries by date with completion status based on content (has highs OR lows = complete)
  const entriesByDate = calendarEntries?.reduce((acc: Record<string, 'complete' | 'incomplete'>, e: any) => {
    const hasContent = !!(e.highlights_high || e.highlights_low)
    acc[e.date] = hasContent ? 'complete' : 'incomplete'
    return acc
  }, {} as Record<string, 'complete' | 'incomplete'>) || {}

  // Find first entry date for determining "missing" days
  const firstEntryDate = calendarEntries && calendarEntries.length > 0
    ? calendarEntries.map(e => e.date).sort()[0]
    : null

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-5xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900">Journal</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <Link
                href="/entries/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Entry</span>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Analytics Widget - Only on first page */}
        {currentPage === 1 && analytics && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900">{analytics.totalEntries}</p>
                  <p className="text-sm text-zinc-500">Total Entries</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-zinc-900">{analytics.incompleteDays}</p>
                  <p className="text-sm text-zinc-500">Incomplete Days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <form className="bg-white rounded-xl border border-zinc-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                name="tag"
                defaultValue={tag}
                placeholder="Tag..."
                className="w-24 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <input
                name="from"
                defaultValue={from}
                type="date"
                className="w-32 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <input
                name="to"
                defaultValue={to}
                type="date"
                className="w-32 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <label className="flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg text-sm cursor-pointer hover:bg-zinc-50 transition-colors">
                <input
                  type="checkbox"
                  name="incomplete"
                  value="1"
                  defaultChecked={!!incomplete}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-zinc-600">Incomplete</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Filter
              </button>
              {(q || tag || from || to || incomplete) && (
                <Link
                  href="/entries"
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>
        </form>

        <EntriesContent>
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <NavLink
              href="/entries?view=calendar"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                effectiveView !== 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </NavLink>
            <NavLink
              href="/entries?view=list"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                effectiveView === 'list' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </NavLink>
          </div>
          <p className="text-sm text-zinc-500">
            {totalCount} entries
          </p>
        </div>

        {/* Calendar View */}
        {effectiveView !== 'list' ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1">
                <NavLink
                  href={calendarUrl(prevYear)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Previous year"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </NavLink>
                <NavLink
                  href={calendarUrl(prevMonth)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </NavLink>
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-zinc-900">
                  {format(calendarDate, 'MMMM yyyy')}
                </h2>
                {!isCurrentMonth && (
                  <NavLink
                    href="/entries?view=calendar"
                    className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded hover:bg-zinc-200 transition-colors"
                  >
                    Today
                  </NavLink>
                )}
              </div>

              <div className="flex items-center gap-1">
                <NavLink
                  href={calendarUrl(nextMonth)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </NavLink>
                <NavLink
                  href={calendarUrl(nextYear)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Next year"
                >
                  <ChevronsRight className="w-4 h-4" />
                </NavLink>
              </div>
            </div>

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
                const entryStatus = entriesByDate[dateStr]
                const isFutureDay = day > today
                const isBeforeFirstEntry = firstEntryDate && dateStr < firstEntryDate
                const isMissingDay = !entryStatus && !isFutureDay && !isBeforeFirstEntry && firstEntryDate

                // Determine background color based on state
                let bgClass = 'text-zinc-600 hover:bg-zinc-50' // default: future or before first entry
                if (entryStatus === 'complete') {
                  bgClass = 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                } else if (entryStatus === 'incomplete') {
                  bgClass = 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                } else if (isMissingDay) {
                  bgClass = 'bg-red-100 text-red-900 hover:bg-red-200'
                }

                return (
                  <Link
                    key={dateStr}
                    href={entryStatus ? `/entries/${dateStr}` : `/entries/new?date=${dateStr}`}
                    className={`h-10 flex items-center justify-center rounded-lg text-sm transition-colors ${bgClass} ${
                      isSameDay(day, today) ? 'ring-2 ring-zinc-900 ring-offset-1 font-medium' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </Link>
                )
              })}
            </div>
            {/* Calendar Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
                <span>Complete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
                <span>Incomplete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
                <span>Missing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-white border border-zinc-200" />
                <span>Future</span>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {incomplete ? (
              // Render incomplete days (missing + incomplete entries)
              incompleteDays.map((day) =>
                day.type === 'missing' ? (
                  <MissingDayCard key={day.date} date={day.date} />
                ) : (
                  <EntryCard key={day.date} entry={day.entry} tags={[]} />
                )
              )
            ) : (
              // Render regular entries
              entries.map((entry: any) => {
                const tags = entry.entry_tags
                  ?.map((et: any) => et.tags?.name)
                  .filter((name: unknown): name is string => typeof name === 'string') || []

                return (
                  <EntryCard key={entry.id} entry={entry} tags={tags} />
                )
              })
            )}

            {((incomplete && incompleteDays.length === 0) || (!incomplete && entries.length === 0)) && (
              <div className="text-center py-16">
                <p className="text-zinc-500 mb-4">No entries found</p>
                <Link
                  href="/entries/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create your first entry
                </Link>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <Link
                  href={`/entries?page=${currentPage - 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}${incomplete ? `&incomplete=${incomplete}` : ''}`}
                  className={`p-2 rounded-lg border border-zinc-200 transition-colors ${
                    currentPage === 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-50'
                  }`}
                  aria-disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>

                <span className="px-4 text-sm text-zinc-500">
                  Page {currentPage} of {totalPages}
                </span>

                <Link
                  href={`/entries?page=${currentPage + 1}${q ? `&q=${q}` : ''}${tag ? `&tag=${tag}` : ''}${incomplete ? `&incomplete=${incomplete}` : ''}`}
                  className={`p-2 rounded-lg border border-zinc-200 transition-colors ${
                    currentPage === totalPages ? 'opacity-50 pointer-events-none' : 'hover:bg-zinc-50'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        )}
        </EntriesContent>
      </div>
    </div>
  )
}
