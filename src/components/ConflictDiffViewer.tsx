'use client'

import { useState } from 'react'
import { GitMerge } from 'lucide-react'
import type { PendingImport, ImportEntryData } from '@/types/entry'

interface Props {
  initialConflicts: PendingImport[]
}

const NUMERIC_FIELDS: { key: keyof ImportEntryData; label: string }[] = [
  { key: 'p_score', label: 'P Score' },
  { key: 'l_score', label: 'L Score' },
  { key: 'weight', label: 'Weight' },
  { key: 'calories', label: 'Calories' },
  { key: 'sleep_hours', label: 'Sleep Hrs' },
]

const TEXT_FIELDS: { key: keyof ImportEntryData; label: string }[] = [
  { key: 'highlights_high', label: 'Highs' },
  { key: 'highlights_low', label: 'Lows' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'night', label: 'Night' },
  { key: 'more', label: 'More' },
]

function tagsEqual(a: string[], b: string[]): boolean {
  const setA = new Set(a.map(t => t.toLowerCase()))
  const setB = new Set(b.map(t => t.toLowerCase()))
  if (setA.size !== setB.size) return false
  for (const t of setA) if (!setB.has(t)) return false
  return true
}

function TagChips({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-zinc-400 text-xs italic">none</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs">{t}</span>
      ))}
    </div>
  )
}

function ConflictCard({
  conflict,
  onResolved,
}: {
  conflict: PendingImport
  onResolved: (id: string) => void
}) {
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const web = conflict.db_data
  const obs = conflict.obsidian_data

  async function resolve(resolution: 'obsidian' | 'web') {
    setIsResolving(true)
    setError(null)
    try {
      const res = await fetch('/api/import/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conflict.id, resolution }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to resolve conflict')
        return
      }
      onResolved(conflict.id)
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{conflict.date}</h3>
        <span className="text-xs text-zinc-400">Conflict</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[120px_1fr_1fr] min-w-[480px]">
          {/* Header row */}
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-500 border-b border-r border-zinc-100">
            Field
          </div>
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-700 border-b border-r border-zinc-100">
            Web (current)
          </div>
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-700 border-b border-zinc-100">
            Obsidian (import)
          </div>

          {/* Numeric fields */}
          {NUMERIC_FIELDS.map(({ key, label }) => {
            const differs = (web[key] ?? null) !== (obs[key] ?? null)
            const rowClass = differs ? 'bg-amber-50' : ''
            return (
              <>
                <div key={`${key}-label`} className={`px-3 py-2 text-xs text-zinc-500 border-b border-r border-zinc-100 ${rowClass}`}>
                  {label}
                </div>
                <div key={`${key}-web`} className={`px-3 py-2 text-sm text-zinc-700 border-b border-r border-zinc-100 ${rowClass}`}>
                  {web[key] != null ? String(web[key]) : <span className="text-zinc-300">—</span>}
                </div>
                <div key={`${key}-obs`} className={`px-3 py-2 text-sm text-zinc-700 border-b border-zinc-100 ${rowClass}`}>
                  {obs[key] != null ? String(obs[key]) : <span className="text-zinc-300">—</span>}
                </div>
              </>
            )
          })}

          {/* Tags row */}
          {(() => {
            const differs = !tagsEqual(web.tags ?? [], obs.tags ?? [])
            const rowClass = differs ? 'bg-amber-50' : ''
            return (
              <>
                <div className={`px-3 py-2 text-xs text-zinc-500 border-b border-r border-zinc-100 ${rowClass}`}>
                  Tags
                </div>
                <div className={`px-3 py-2 border-b border-r border-zinc-100 ${rowClass}`}>
                  <TagChips tags={web.tags ?? []} />
                </div>
                <div className={`px-3 py-2 border-b border-zinc-100 ${rowClass}`}>
                  <TagChips tags={obs.tags ?? []} />
                </div>
              </>
            )
          })()}

          {/* Text fields */}
          {TEXT_FIELDS.map(({ key, label }) => {
            const differs = (web[key] ?? null) !== (obs[key] ?? null)
            const rowClass = differs ? 'bg-amber-50' : ''
            const isLast = key === 'more'
            const borderClass = isLast ? '' : 'border-b'
            return (
              <>
                <div key={`${key}-label`} className={`px-3 py-2 text-xs text-zinc-500 ${borderClass} border-r border-zinc-100 ${rowClass}`}>
                  {label}
                </div>
                <div key={`${key}-web`} className={`px-3 py-2 ${borderClass} border-r border-zinc-100 ${rowClass}`}>
                  {web[key] ? (
                    <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{web[key]}</pre>
                  ) : (
                    <span className="text-zinc-300 text-xs">—</span>
                  )}
                </div>
                <div key={`${key}-obs`} className={`px-3 py-2 ${borderClass} border-zinc-100 ${rowClass}`}>
                  {obs[key] ? (
                    <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{obs[key]}</pre>
                  ) : (
                    <span className="text-zinc-300 text-xs">—</span>
                  )}
                </div>
              </>
            )
          })}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => resolve('web')}
            disabled={isResolving}
            className="text-sm px-3 py-1.5 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResolving ? '...' : 'Keep Web'}
          </button>
          <button
            onClick={() => resolve('obsidian')}
            disabled={isResolving}
            className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResolving ? '...' : 'Use Obsidian'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConflictDiffViewer({ initialConflicts }: Props) {
  const [conflicts, setConflicts] = useState<PendingImport[]>(initialConflicts)

  function handleResolved(id: string) {
    setConflicts(prev => prev.filter(c => c.id !== id))
  }

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <GitMerge className="w-10 h-10 mb-3" />
        <p className="text-sm">All conflicts resolved</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {conflicts.map(conflict => (
        <ConflictCard key={conflict.id} conflict={conflict} onResolved={handleResolved} />
      ))}
    </div>
  )
}
