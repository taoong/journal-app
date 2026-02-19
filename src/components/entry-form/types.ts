export interface TagType {
  id: string
  name: string
}

export interface CalendarEvent {
  id: string
  summary: string
  start_time: string
  end_time: string
}

export interface Entry {
  id: string
  date: string
  highlights_high?: string
  highlights_low?: string
  morning?: string
  afternoon?: string
  night?: string
  p_score?: number
  l_score?: number
  weight?: number
  complete?: boolean
}

export interface FormState {
  date: string
  highlightsHigh: string
  highlightsLow: string
  morning: string
  afternoon: string
  night: string
  pScore: number
  lScore: number
  weight: string
}

export interface EntryFormProps {
  initialDate: string
  entry?: Entry
  selectedTagIds?: string[]
  availableTags: TagType[]
  userId: string
}
