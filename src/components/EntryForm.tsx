'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/lib/supabase'
import { DebouncedTextarea } from '@/components/ui/debounced-textarea'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Calendar, Plus, Loader2, Check, AlertCircle } from 'lucide-react'

interface TagType {
  id: string
  name: string
}

interface CalendarEvent {
  id: string
  summary: string
  start_time: string
  end_time: string
}

interface Entry {
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

interface EntryFormProps {
  initialDate: string
  entry?: Entry
  selectedTagIds?: string[]
  availableTags: TagType[]
  userId: string
}

// Consolidated form state type
interface FormState {
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

// Memoized tag button to prevent re-renders
const TagButton = memo(function TagButton({
  tag,
  isSelected,
  onToggle,
}: {
  tag: TagType
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tag.id)}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
        isSelected
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
      }`}
    >
      {tag.name}
      {isSelected && <Check className="w-3 h-3" />}
    </button>
  )
})

export default function EntryForm({
  initialDate,
  entry,
  selectedTagIds = [],
  availableTags: initialTags,
  userId,
}: EntryFormProps) {
  const router = useRouter()
  const supabase = useSupabase()

  // Consolidated form state to reduce re-renders
  const [form, setForm] = useState<FormState>(() => ({
    date: entry?.date || initialDate,
    highlightsHigh: entry?.highlights_high || '',
    highlightsLow: entry?.highlights_low || '',
    morning: entry?.morning || '',
    afternoon: entry?.afternoon || '',
    night: entry?.night || '',
    pScore: entry?.p_score ?? 5,
    lScore: entry?.l_score ?? 5,
    weight: entry?.weight?.toString() || '',
  }))

  // UI state
  const [tags, setTags] = useState<Set<string>>(() => new Set(selectedTagIds))
  const [availableTags, setAvailableTags] = useState<TagType[]>(initialTags)
  const [newTag, setNewTag] = useState('')
  const [complete, setComplete] = useState(entry?.complete ?? false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [fetchingCalendar, setFetchingCalendar] = useState(false)
  const [calendarNeedsAuth, setCalendarNeedsAuth] = useState(false)

  // Local slider state for immediate visual feedback
  const [localPScore, setLocalPScore] = useState(form.pScore)
  const [localLScore, setLocalLScore] = useState(form.lScore)

  // Memoized form field updater
  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // Stable memoized handlers for debounced components
  const fieldHandlers = useMemo(() => ({
    highlightsHigh: (value: string) => updateField('highlightsHigh', value),
    highlightsLow: (value: string) => updateField('highlightsLow', value),
    morning: (value: string) => updateField('morning', value),
    afternoon: (value: string) => updateField('afternoon', value),
    night: (value: string) => updateField('night', value),
    weight: (value: string) => updateField('weight', value),
  }), [updateField])

  // Stable memoized handlers for sliders
  const sliderHandlers = useMemo(() => ({
    pScore: {
      onChange: ([value]: number[]) => setLocalPScore(value),
      onCommit: ([value]: number[]) => updateField('pScore', value),
    },
    lScore: {
      onChange: ([value]: number[]) => setLocalLScore(value),
      onCommit: ([value]: number[]) => updateField('lScore', value),
    },
  }), [updateField])

  const handleTagToggle = useCallback((tagId: string) => {
    setTags(prev => {
      const newTags = new Set(prev)
      if (newTags.has(tagId)) {
        newTags.delete(tagId)
      } else {
        newTags.add(tagId)
      }
      return newTags
    })
  }, [])

  const handleAddTag = useCallback(async () => {
    if (!newTag.trim()) return

    const { data, error: tagError } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: newTag.trim() })
      .select()
      .single()

    if (tagError) {
      setError('Error creating tag: ' + tagError.message)
      return
    }

    if (data) {
      // Create new array instead of mutating prop
      setAvailableTags(prev => [...prev, data])
      setTags(prev => new Set([...prev, data.id]))
      setNewTag('')
    }
  }, [newTag, supabase, userId])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const entryData = {
        user_id: userId,
        date: form.date,
        highlights_high: form.highlightsHigh || null,
        highlights_low: form.highlightsLow || null,
        morning: form.morning || null,
        afternoon: form.afternoon || null,
        night: form.night || null,
        p_score: form.pScore,
        l_score: form.lScore,
        weight: form.weight ? parseFloat(form.weight) : null,
        complete,
      }

      const { data: entryResult, error: entryError } = await supabase
        .from('entries')
        .upsert(entryData, { onConflict: 'user_id,date' })
        .select()
        .single()

      if (entryError) throw entryError

      await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', entryResult.id)

      if (tags.size > 0) {
        const entryTags = Array.from(tags).map(tagId => ({
          entry_id: entryResult.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase
          .from('entry_tags')
          .insert(entryTags)

        if (tagsError) throw tagsError
      }

      router.push('/entries')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [form, tags, userId, supabase, router])

  const fetchCalendarEvents = useCallback(async () => {
    setFetchingCalendar(true)
    setError('')
    setCalendarNeedsAuth(false)

    try {
      const res = await fetch(`/api/calendar?date=${form.date}`)
      const data = await res.json()

      if (data.error) {
        if (data.needsReauth) {
          setCalendarNeedsAuth(true)
          setError('Calendar access expired. Click "Re-authenticate" below to restore access.')
        } else {
          setError('Error fetching calendar: ' + data.error)
        }
        return
      }

      setCalendarEvents(data.events || [])
    } catch (err) {
      setError('Error fetching calendar: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setFetchingCalendar(false)
    }
  }, [form.date])

  const reauthenticateCalendar = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login?reauth=calendar')
  }, [supabase, router])

  const stubFromCalendar = useCallback(() => {
    if (calendarEvents.length === 0) return

    const eventList = calendarEvents
      .map((e) => {
        const start = new Date(e.start_time)
        const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return `- ${time} ${e.summary}`
      })
      .join('\n')

    updateField('morning', `${form.morning}\n\n📅 Today's Calendar:\n${eventList}`)
  }, [calendarEvents, form.morning, updateField])

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => updateField('date', e.target.value)}
          required
        />
      </div>

      {/* Calendar Integration */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-600" />
            <span className="font-medium text-zinc-900">Google Calendar</span>
          </div>
          <div className="flex gap-2">
            {calendarNeedsAuth && (
              <button
                type="button"
                onClick={reauthenticateCalendar}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-500 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Re-authenticate
              </button>
            )}
            <button
              type="button"
              onClick={fetchCalendarEvents}
              disabled={fetchingCalendar || calendarNeedsAuth}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {fetchingCalendar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Fetch Events'
              )}
            </button>
          </div>
        </div>
        
        {calendarEvents.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} found
            </p>
            <button
              type="button"
              onClick={stubFromCalendar}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Stub into Morning
            </button>
          </div>
        )}

        {calendarEvents.length === 0 && !fetchingCalendar && !calendarNeedsAuth && (
          <p className="text-sm text-zinc-500">
            Click &quot;Fetch Events&quot; to pull today&apos;s calendar
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="highlights-high">Highlights</Label>
          <DebouncedTextarea
            id="highlights-high"
            placeholder="What went well today?"
            value={form.highlightsHigh}
            onChange={fieldHandlers.highlightsHigh}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="highlights-low">Lowlights</Label>
          <DebouncedTextarea
            id="highlights-low"
            placeholder="What could have been better?"
            value={form.highlightsLow}
            onChange={fieldHandlers.highlightsLow}
            rows={4}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="morning">Morning</Label>
        <DebouncedTextarea
          id="morning"
          placeholder="How was your morning?"
          value={form.morning}
          onChange={fieldHandlers.morning}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="afternoon">Afternoon</Label>
        <DebouncedTextarea
          id="afternoon"
          placeholder="How was your afternoon?"
          value={form.afternoon}
          onChange={fieldHandlers.afternoon}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="night">Night</Label>
        <DebouncedTextarea
          id="night"
          placeholder="How was your evening?"
          value={form.night}
          onChange={fieldHandlers.night}
          rows={5}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>P Score</Label>
            <span className="text-sm font-medium text-zinc-600">{localPScore}/10</span>
          </div>
          <Slider
            value={[localPScore]}
            onValueChange={sliderHandlers.pScore.onChange}
            onValueCommit={sliderHandlers.pScore.onCommit}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>L Score</Label>
            <span className="text-sm font-medium text-zinc-600">{localLScore}/10</span>
          </div>
          <Slider
            value={[localLScore]}
            onValueChange={sliderHandlers.lScore.onChange}
            onValueCommit={sliderHandlers.lScore.onCommit}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <DebouncedInput
            id="weight"
            type="number"
            step="0.1"
            placeholder="lbs"
            value={form.weight}
            onChange={fieldHandlers.weight}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <TagButton
              key={tag.id}
              tag={tag}
              isSelected={tags.has(tag.id)}
              onToggle={handleTagToggle}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mark as Complete */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={complete}
            onChange={(e) => setComplete(e.target.checked)}
            className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <span className="font-medium text-emerald-900">Mark as Complete</span>
            <p className="text-sm text-emerald-600">Check this when you&apos;ve finished your entry for the day</p>
          </div>
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : entry ? (
            'Update Entry'
          ) : (
            'Create Entry'
          )}
        </button>
        <Link
          href="/entries"
          className="px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors font-medium"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
