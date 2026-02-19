'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/supabase'
import type { FormState, Entry, TagType, CalendarEvent } from './types'

interface UseEntryFormOptions {
  initialDate: string
  entry?: Entry
  selectedTagIds: string[]
  initialTags: TagType[]
  userId: string
}

export function useEntryForm({
  initialDate,
  entry,
  selectedTagIds,
  initialTags,
  userId,
}: UseEntryFormOptions) {
  const router = useRouter()
  const supabase = useSupabase()

  // Form state
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

  // Existing entry detection
  const [existingEntryDate, setExistingEntryDate] = useState<string | null>(null)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)
  const isNewEntry = !entry

  // Local slider state for immediate visual feedback
  const [localPScore, setLocalPScore] = useState(form.pScore)
  const [localLScore, setLocalLScore] = useState(form.lScore)

  // Check for existing entry when date changes (only in new entry mode)
  useEffect(() => {
    if (!isNewEntry) return

    const checkExistingEntry = async () => {
      const { data } = await supabase
        .from('entries')
        .select('id')
        .eq('user_id', userId)
        .eq('date', form.date)
        .maybeSingle()

      setExistingEntryDate(data ? form.date : null)
    }

    checkExistingEntry()
  }, [form.date, isNewEntry, supabase, userId])

  // Field update handler
  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // Stable memoized handlers for debounced components
  const fieldHandlers = useMemo(
    () => ({
      highlightsHigh: (value: string) => updateField('highlightsHigh', value),
      highlightsLow: (value: string) => updateField('highlightsLow', value),
      morning: (value: string) => updateField('morning', value),
      afternoon: (value: string) => updateField('afternoon', value),
      night: (value: string) => updateField('night', value),
      weight: (value: string) => updateField('weight', value),
    }),
    [updateField]
  )

  // Stable memoized handlers for sliders
  const sliderHandlers = useMemo(
    () => ({
      pScore: {
        onChange: ([value]: number[]) => setLocalPScore(value),
        onCommit: ([value]: number[]) => updateField('pScore', value),
      },
      lScore: {
        onChange: ([value]: number[]) => setLocalLScore(value),
        onCommit: ([value]: number[]) => updateField('lScore', value),
      },
    }),
    [updateField]
  )

  const handleTagToggle = useCallback((tagId: string) => {
    setTags((prev) => {
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
      setAvailableTags((prev) => [...prev, data])
      setTags((prev) => new Set([...prev, data.id]))
      setNewTag('')
    }
  }, [newTag, supabase, userId])

  const handleSubmit = useCallback(
    async (e: React.FormEvent, forceOverwrite = false) => {
      e.preventDefault()

      if (isNewEntry && existingEntryDate && !forceOverwrite) {
        setShowOverwriteConfirm(true)
        return
      }

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

        await supabase.from('entry_tags').delete().eq('entry_id', entryResult.id)

        if (tags.size > 0) {
          const entryTags = Array.from(tags).map((tagId) => ({
            entry_id: entryResult.id,
            tag_id: tagId,
          }))

          const { error: tagsError } = await supabase
            .from('entry_tags')
            .insert(entryTags)

          if (tagsError) throw tagsError
        }

        router.push('/entries')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    },
    [form, tags, complete, userId, supabase, router, isNewEntry, existingEntryDate]
  )

  const handleConfirmOverwrite = useCallback(() => {
    setShowOverwriteConfirm(false)
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
    handleSubmit(syntheticEvent, true)
  }, [handleSubmit])

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
          setError(
            'Calendar access expired. Click "Re-authenticate" below to restore access.'
          )
        } else {
          setError('Error fetching calendar: ' + data.error)
        }
        return
      }

      setCalendarEvents(data.events || [])
    } catch (err) {
      setError(
        'Error fetching calendar: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      )
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
        const time = start.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
        return `- ${time} ${e.summary}`
      })
      .join('\n')

    updateField('morning', `${form.morning}\n\n📅 Today's Calendar:\n${eventList}`)
  }, [calendarEvents, form.morning, updateField])

  return {
    // Form state
    form,
    updateField,
    fieldHandlers,
    sliderHandlers,
    localPScore,
    localLScore,

    // Tags
    tags,
    availableTags,
    newTag,
    setNewTag,
    handleTagToggle,
    handleAddTag,

    // Complete
    complete,
    setComplete,

    // Status
    error,
    loading,
    isNewEntry,

    // Existing entry
    existingEntryDate,
    showOverwriteConfirm,
    setShowOverwriteConfirm,
    handleConfirmOverwrite,

    // Calendar
    calendarEvents,
    fetchingCalendar,
    calendarNeedsAuth,
    fetchCalendarEvents,
    reauthenticateCalendar,
    stubFromCalendar,

    // Submit
    handleSubmit,
  }
}
