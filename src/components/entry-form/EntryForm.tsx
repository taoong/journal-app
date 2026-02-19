'use client'

import Link from 'next/link'
import { DebouncedTextarea } from '@/components/ui/debounced-textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { useEntryForm } from './use-entry-form'
import { CalendarIntegration } from './CalendarIntegration'
import { TagSelector } from './TagSelector'
import { ScoreSliders } from './ScoreSliders'
import { OverwriteModal } from './OverwriteModal'
import type { EntryFormProps } from './types'

export default function EntryForm({
  initialDate,
  entry,
  selectedTagIds = [],
  availableTags: initialTags,
  userId,
}: EntryFormProps) {
  const {
    form,
    updateField,
    fieldHandlers,
    sliderHandlers,
    localPScore,
    localLScore,
    tags,
    availableTags,
    newTag,
    setNewTag,
    handleTagToggle,
    handleAddTag,
    complete,
    setComplete,
    error,
    loading,
    isNewEntry,
    existingEntryDate,
    showOverwriteConfirm,
    setShowOverwriteConfirm,
    handleConfirmOverwrite,
    calendarEvents,
    fetchingCalendar,
    calendarNeedsAuth,
    fetchCalendarEvents,
    reauthenticateCalendar,
    stubFromCalendar,
    handleSubmit,
  } = useEntryForm({
    initialDate,
    entry,
    selectedTagIds,
    initialTags,
    userId,
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Warning: Entry already exists for this date */}
      {isNewEntry && existingEntryDate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-medium">An entry already exists for this date</p>
            <p className="mt-1 text-amber-700">
              Creating a new entry will overwrite the existing one.
            </p>
            <Link
              href={`/entries/${existingEntryDate}`}
              className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-500 transition-colors"
            >
              Edit existing entry
            </Link>
          </div>
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
      <CalendarIntegration
        calendarEvents={calendarEvents}
        fetchingCalendar={fetchingCalendar}
        calendarNeedsAuth={calendarNeedsAuth}
        onFetchCalendar={fetchCalendarEvents}
        onReauthenticate={reauthenticateCalendar}
        onStubFromCalendar={stubFromCalendar}
      />

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

      {/* Score Sliders and Weight */}
      <ScoreSliders
        localPScore={localPScore}
        localLScore={localLScore}
        weight={form.weight}
        sliderHandlers={sliderHandlers}
        onWeightChange={fieldHandlers.weight}
      />

      {/* Tag Selector */}
      <TagSelector
        tags={tags}
        availableTags={availableTags}
        newTag={newTag}
        onNewTagChange={setNewTag}
        onTagToggle={handleTagToggle}
        onAddTag={handleAddTag}
      />

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
            <p className="text-sm text-emerald-600">
              Check this when you&apos;ve finished your entry for the day
            </p>
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

      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && (
        <OverwriteModal
          existingEntryDate={existingEntryDate}
          loading={loading}
          onCancel={() => setShowOverwriteConfirm(false)}
          onConfirm={handleConfirmOverwrite}
        />
      )}
    </form>
  )
}
