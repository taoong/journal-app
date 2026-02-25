import { format } from 'date-fns'
import { JOURNAL_START_DATE } from './constants'
import type { IncompleteDayItem } from '@/types/entry'

interface EntryData {
  date: string
  highlights_high: string | null
  highlights_low: string | null
  complete: boolean
  id?: string
  p_score?: number | null
  l_score?: number | null
}

export type DayStatus = 'complete' | 'incomplete' | 'missing' | 'future' | 'none'

/**
 * Single source of truth for the status of any given day.
 *
 * Rules (in priority order):
 *  1. Future dates            → 'future'
 *  2. Before firstEntryDate   → 'none'    (no journal history yet)
 *  3. Pre-2025 entries        → 'complete' (won't be updated)
 *  4. Today with no entry     → 'incomplete' (still time to write)
 *  5. Past date with no entry → 'missing'
 *  6. Entry exists            → 'complete' or 'incomplete' based on content/flag
 */
export function getDayStatus(
  dateStr: string,
  todayStr: string,
  entry: Pick<EntryData, 'date' | 'highlights_high' | 'highlights_low' | 'complete'> | undefined,
  firstEntryDate: string
): DayStatus {
  if (dateStr > todayStr) return 'future'
  if (dateStr < firstEntryDate) return 'none'
  if (dateStr < '2025-01-01') return 'complete'
  if (!entry) return dateStr === todayStr ? 'incomplete' : 'missing'
  const hasContent = !!(entry.highlights_high || entry.highlights_low)
  return entry.complete !== false && hasContent ? 'complete' : 'incomplete'
}

/**
 * Calculate all incomplete days between the journal start date and today.
 * Returns an array sorted descending (most recent first).
 * Today with no entry is excluded — it's not overdue yet.
 */
export function calculateIncompleteDays(
  allEntries: EntryData[],
  todayStr: string
): IncompleteDayItem[] {
  const startDate = new Date(JOURNAL_START_DATE + 'T00:00:00')
  const todayDate = new Date(todayStr + 'T00:00:00')
  const entriesByDate = new Map(allEntries.map((e) => [e.date, e]))

  const incompleteDays: IncompleteDayItem[] = []

  for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd')
    const entry = entriesByDate.get(dateStr)
    const status = getDayStatus(dateStr, todayStr, entry, JOURNAL_START_DATE)

    if (status === 'missing') {
      incompleteDays.push({ date: dateStr, type: 'missing' })
    } else if (status === 'incomplete' && entry) {
      incompleteDays.push({
        date: dateStr,
        type: 'incomplete',
        entry: {
          id: entry.id!,
          date: entry.date,
          p_score: entry.p_score ?? null,
          l_score: entry.l_score ?? null,
          highlights_high: entry.highlights_high,
          highlights_low: entry.highlights_low,
        },
      })
    }
  }

  incompleteDays.sort((a, b) => b.date.localeCompare(a.date))
  return incompleteDays
}

/**
 * Count incomplete days between journal start and today.
 * Today with no entry is excluded — it's not overdue yet.
 */
export function countIncompleteDays(
  allEntries: EntryData[],
  todayStr: string
): number {
  const startDate = new Date(JOURNAL_START_DATE + 'T00:00:00')
  const todayDate = new Date(todayStr + 'T00:00:00')
  const entriesByDate = new Map(allEntries.map((e) => [e.date, e]))

  let count = 0
  for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd')
    const entry = entriesByDate.get(dateStr)
    const status = getDayStatus(dateStr, todayStr, entry, JOURNAL_START_DATE)
    if (status === 'missing' || (status === 'incomplete' && entry)) count++
  }
  return count
}
