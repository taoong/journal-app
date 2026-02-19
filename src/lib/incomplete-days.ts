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

/**
 * Checks if an entry is considered complete based on content and explicit flag
 */
export function isEntryComplete(entry: Pick<EntryData, 'highlights_high' | 'highlights_low' | 'complete'>): boolean {
  const hasContent = !!(entry.highlights_high || entry.highlights_low)
  return entry.complete !== false && hasContent
}

/**
 * Calculate all incomplete days between the journal start date and today.
 * Returns an array sorted descending (most recent first).
 */
export function calculateIncompleteDays(
  allEntries: EntryData[],
  todayStr: string
): IncompleteDayItem[] {
  const startDate = new Date(JOURNAL_START_DATE + 'T00:00:00')
  const todayDate = new Date(todayStr + 'T00:00:00')
  const entryDates = new Set(allEntries.map((e) => e.date))
  const isCompleteMap = new Map(
    allEntries.map((e) => [e.date, isEntryComplete(e)])
  )
  const entriesByDate = new Map(allEntries.map((e) => [e.date, e]))

  const incompleteDays: IncompleteDayItem[] = []

  for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd')
    if (!entryDates.has(dateStr)) {
      incompleteDays.push({ date: dateStr, type: 'missing' })
    } else if (!isCompleteMap.get(dateStr)) {
      const entry = entriesByDate.get(dateStr)
      incompleteDays.push({
        date: dateStr,
        type: 'incomplete',
        entry: entry
          ? {
              id: entry.id!,
              date: entry.date,
              p_score: entry.p_score ?? null,
              l_score: entry.l_score ?? null,
              highlights_high: entry.highlights_high,
              highlights_low: entry.highlights_low,
            }
          : undefined,
      })
    }
  }

  // Sort descending (most recent first)
  incompleteDays.sort((a, b) => b.date.localeCompare(a.date))
  return incompleteDays
}

/**
 * Count the number of incomplete days between journal start and today
 */
export function countIncompleteDays(
  allEntries: EntryData[],
  todayStr: string
): number {
  const startDate = new Date(JOURNAL_START_DATE + 'T00:00:00')
  const todayDate = new Date(todayStr + 'T00:00:00')
  const entryDates = new Set(allEntries.map((e) => e.date))
  const isCompleteMap = new Map(
    allEntries.map((e) => [e.date, isEntryComplete(e)])
  )

  let count = 0
  for (let d = new Date(startDate); d <= todayDate; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, 'yyyy-MM-dd')
    if (!entryDates.has(dateStr) || !isCompleteMap.get(dateStr)) {
      count++
    }
  }
  return count
}
