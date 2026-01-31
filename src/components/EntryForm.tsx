'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Calendar, Plus, Loader2, Check } from 'lucide-react'

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
}

interface EntryFormProps {
  initialDate: string
  entry?: Entry
  selectedTagIds?: string[]
  availableTags: TagType[]
  userId: string
}

export default function EntryForm({
  initialDate,
  entry,
  selectedTagIds = [],
  availableTags,
  userId,
}: EntryFormProps) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [date, setDate] = useState(entry?.date || initialDate)
  const [highlightsHigh, setHighlightsHigh] = useState(entry?.highlights_high || '')
  const [highlightsLow, setHighlightsLow] = useState(entry?.highlights_low || '')
  const [morning, setMorning] = useState(entry?.morning || '')
  const [afternoon, setAfternoon] = useState(entry?.afternoon || '')
  const [night, setNight] = useState(entry?.night || '')
  const [pScore, setPScore] = useState(entry?.p_score ?? 5)
  const [lScore, setLScore] = useState(entry?.l_score ?? 5)
  const [weight, setWeight] = useState(entry?.weight?.toString() || '')
  const [tags, setTags] = useState<Set<string>>(new Set(selectedTagIds))
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [fetchingCalendar, setFetchingCalendar] = useState(false)
  // const [calendarConnected, setCalendarConnected] = useState(true)

  const handleTagToggle = (tagId: string) => {
    const newTags = new Set(tags)
    if (newTags.has(tagId)) {
      newTags.delete(tagId)
    } else {
      newTags.add(tagId)
    }
    setTags(newTags)
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: newTag.trim() })
      .select()
      .single()

    if (error) {
      setError('Error creating tag: ' + error.message)
      return
    }

    if (data) {
      availableTags.push(data)
      setTags(new Set([...tags, data.id]))
      setNewTag('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const entryData = {
        user_id: userId,
        date,
        highlights_high: highlightsHigh || null,
        highlights_low: highlightsLow || null,
        morning: morning || null,
        afternoon: afternoon || null,
        night: night || null,
        p_score: pScore,
        l_score: lScore,
        weight: weight ? parseFloat(weight) : null,
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
  }

  const fetchCalendarEvents = async () => {
    setFetchingCalendar(true)
    setError('')
    // setCalendarConnected(true)
    
    try {
      const res = await fetch(`/api/calendar?date=${date}`)
      const data = await res.json()

      if (data.error) {
        if (data.needsReauth) {
          // setCalendarConnected(false)
          setError('Calendar not connected. Please sign out and re-login to grant calendar access.')
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
  }

  const stubFromCalendar = () => {
    if (calendarEvents.length === 0) return

    const eventList = calendarEvents
      .map((e) => {
        const start = new Date(e.start_time)
        const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return `- ${time} ${e.summary}`
      })
      .join('\n')

    setMorning((prev) => `${prev}\n\n📅 Today's Calendar:\n${eventList}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
          <button
            type="button"
            onClick={fetchCalendarEvents}
            disabled={fetchingCalendar}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {fetchingCalendar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Fetch Events'
            )}
          </button>
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

        {calendarEvents.length === 0 && !fetchingCalendar && !error && (
          <p className="text-sm text-zinc-500">
            Click &quot;Fetch Events&quot; to pull today&apos;s calendar
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="highlights-high">Highlights</Label>
          <Textarea
            id="highlights-high"
            placeholder="What went well today?"
            value={highlightsHigh}
            onChange={(e) => setHighlightsHigh(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="highlights-low">Lowlights</Label>
          <Textarea
            id="highlights-low"
            placeholder="What could have been better?"
            value={highlightsLow}
            onChange={(e) => setHighlightsLow(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="morning">Morning</Label>
        <Textarea
          id="morning"
          placeholder="How was your morning?"
          value={morning}
          onChange={(e) => setMorning(e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="afternoon">Afternoon</Label>
        <Textarea
          id="afternoon"
          placeholder="How was your afternoon?"
          value={afternoon}
          onChange={(e) => setAfternoon(e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="night">Night</Label>
        <Textarea
          id="night"
          placeholder="How was your evening?"
          value={night}
          onChange={(e) => setNight(e.target.value)}
          rows={5}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>P Score</Label>
            <span className="text-sm font-medium text-zinc-600">{pScore}/10</span>
          </div>
          <Slider
            value={[pScore]}
            onValueChange={([value]) => setPScore(value)}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>L Score</Label>
            <span className="text-sm font-medium text-zinc-600">{lScore}/10</span>
          </div>
          <Slider
            value={[lScore]}
            onValueChange={([value]) => setLScore(value)}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="lbs"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.id)}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                tags.has(tag.id)
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {tag.name}
              {tags.has(tag.id) && <Check className="w-3 h-3" />}
            </button>
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
