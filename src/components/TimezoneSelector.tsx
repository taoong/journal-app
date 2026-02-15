'use client'

import { useState } from 'react'

// Common timezones for US users
const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
]

interface TimezoneSelectorProps {
  initialTimezone: string
}

export default function TimezoneSelector({ initialTimezone }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState(initialTimezone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleChange(newTimezone: string) {
    setTimezone(newTimezone)
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: newTimezone }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save timezone:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={timezone}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      {saving && (
        <span className="text-sm text-zinc-500">Saving...</span>
      )}
      {saved && (
        <span className="text-sm text-emerald-600">Saved</span>
      )}
    </div>
  )
}
