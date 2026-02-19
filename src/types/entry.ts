export interface Entry {
  id: string
  user_id: string
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  highlights_high: string | null
  highlights_low: string | null
  morning: string | null
  afternoon: string | null
  night: string | null
  complete: boolean
  created_at: string
  updated_at: string
}

export interface EntryTag {
  tags: {
    id?: string
    name: string
  }
}

export interface EntryWithTags extends Entry {
  entry_tags?: EntryTag[]
}

export interface CalendarEntry {
  date: string
  highlights_high: string | null
  highlights_low: string | null
  complete: boolean
}

/**
 * Partial entry returned from list query (not all fields)
 */
export interface EntryListItem {
  id: string
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  entry_tags?: { tags: { name: string } }[]
}

export interface IncompleteDayItem {
  date: string
  type: 'missing' | 'incomplete'
  entry?: Pick<Entry, 'id' | 'date' | 'p_score' | 'l_score' | 'highlights_high' | 'highlights_low'>
}

export interface Analytics {
  totalEntries: number
  incompleteDays: number
}
