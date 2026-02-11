import { Plus, Calendar as CalendarIcon, List, Search, Settings } from 'lucide-react'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-200 rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-5xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900">Journal</h1>
            <div className="flex items-center gap-2">
              <div className="p-2 text-zinc-500">
                <Settings className="w-5 h-5" />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium opacity-50">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Entry</span>
              </div>
              <Skeleton className="w-20 h-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Analytics Skeleton */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div>
                <Skeleton className="w-12 h-7 mb-1" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div>
                <Skeleton className="w-12 h-7 mb-1" />
                <Skeleton className="w-24 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <div className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg bg-zinc-50" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-24 h-10" />
              <Skeleton className="w-32 h-10" />
              <Skeleton className="w-32 h-10" />
              <Skeleton className="w-16 h-10" />
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-400">
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-400">
              <List className="w-4 h-4" />
              List
            </div>
          </div>
          <Skeleton className="w-20 h-5" />
        </div>

        {/* Content Skeleton - Calendar style */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            <span className="text-sm text-zinc-400">Loading entries...</span>
          </div>

          {/* Calendar header skeleton */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-8 h-8" />
          </div>

          {/* Calendar grid skeleton */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-zinc-300 py-2">
                {day}
              </div>
            ))}
            {Array(35).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
