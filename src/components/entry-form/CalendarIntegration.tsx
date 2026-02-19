'use client'

import { Calendar, Loader2, Plus, AlertCircle } from 'lucide-react'
import type { CalendarEvent } from './types'

interface CalendarIntegrationProps {
  calendarEvents: CalendarEvent[]
  fetchingCalendar: boolean
  calendarNeedsAuth: boolean
  onFetchCalendar: () => void
  onReauthenticate: () => void
  onStubFromCalendar: () => void
}

export function CalendarIntegration({
  calendarEvents,
  fetchingCalendar,
  calendarNeedsAuth,
  onFetchCalendar,
  onReauthenticate,
  onStubFromCalendar,
}: CalendarIntegrationProps) {
  return (
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
              onClick={onReauthenticate}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-500 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              Re-authenticate
            </button>
          )}
          <button
            type="button"
            onClick={onFetchCalendar}
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
            onClick={onStubFromCalendar}
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
  )
}
