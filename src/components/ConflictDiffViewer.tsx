'use client'

import { useState, useEffect, useRef } from 'react'
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

const TEXT_FIELD_KEYS = new Set<keyof ImportEntryData>([
  'highlights_high', 'highlights_low', 'morning', 'afternoon', 'night', 'more',
])

// null = user has manually edited the combined value (no source ring shown)
type FieldSource = 'web' | 'obsidian' | null
type FieldKind = 'same' | 'smart' | 'conflict'

const ALL_FIELD_KEYS: (keyof ImportEntryData)[] = [
  'p_score', 'l_score', 'weight', 'calories', 'sleep_hours',
  'tags', 'highlights_high', 'highlights_low', 'morning', 'afternoon', 'night', 'more',
]

function tagsEqual(a: string[], b: string[]): boolean {
  const setA = new Set(a.map(t => t.toLowerCase()))
  const setB = new Set(b.map(t => t.toLowerCase()))
  if (setA.size !== setB.size) return false
  for (const t of setA) if (!setB.has(t)) return false
  return true
}

function computeSmartSources(
  web: ImportEntryData,
  obs: ImportEntryData,
): { sources: Record<string, 'web' | 'obsidian'>; kinds: Record<string, FieldKind> } {
  const sources: Record<string, 'web' | 'obsidian'> = {}
  const kinds: Record<string, FieldKind> = {}

  for (const k of ALL_FIELD_KEYS) {
    const webVal = web[k]
    const obsVal = obs[k]
    const differs =
      k === 'tags'
        ? !tagsEqual(web.tags ?? [], obs.tags ?? [])
        : (webVal ?? null) !== (obsVal ?? null)

    if (!differs) { sources[k] = 'web'; kinds[k] = 'same'; continue }

    if (k === 'tags') {
      const w = new Set((web.tags ?? []).map(t => t.toLowerCase()))
      const o = new Set((obs.tags ?? []).map(t => t.toLowerCase()))
      if ([...o].every(t => w.has(t))) { sources[k] = 'web'; kinds[k] = 'smart'; continue }
      if ([...w].every(t => o.has(t))) { sources[k] = 'obsidian'; kinds[k] = 'smart'; continue }
    } else if (TEXT_FIELD_KEYS.has(k)) {
      const w = ((webVal as string | null) ?? '').trim()
      const o = ((obsVal as string | null) ?? '').trim()
      if (o.startsWith(w)) { sources[k] = 'obsidian'; kinds[k] = 'smart'; continue }
      if (w.startsWith(o)) { sources[k] = 'web'; kinds[k] = 'smart'; continue }
    }

    sources[k] = 'web'
    kinds[k] = 'conflict'
  }

  return { sources, kinds }
}

// Returns className for a selectable source button (Web or Obsidian cell)
function selClass(kind: FieldKind, isSelected: boolean): string {
  const base = kind === 'conflict' ? 'bg-amber-50' : 'bg-emerald-50/60'
  if (isSelected) return `${base} ring-2 ring-inset ring-zinc-400 rounded cursor-default`
  if (kind === 'conflict') return `${base} hover:bg-amber-100/70 cursor-pointer`
  return `${base} hover:bg-emerald-100/60 cursor-pointer`
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
  const web = conflict.db_data
  const obs = conflict.obsidian_data

  const { sources: smartSources, kinds } = computeSmartSources(web, obs)
  const allSmart = ALL_FIELD_KEYS.every(k => kinds[k] !== 'conflict')

  // Which source button is highlighted (null = user typed directly, no ring)
  const [fieldSources, setFieldSources] = useState<Record<string, FieldSource>>(
    () => ({ ...smartSources })
  )
  // The actual edit buffer — what gets submitted on Apply
  const [combinedValues, setCombinedValues] = useState<Record<string, ImportEntryData[keyof ImportEntryData]>>(
    () => Object.fromEntries(ALL_FIELD_KEYS.map(k => [k, smartSources[k] === 'web' ? web[k] : obs[k]]))
  )

  const [isResolving, setIsResolving] = useState(allSmart)
  const [error, setError] = useState<string | null>(null)
  const autoApplied = useRef(false)

  async function submitMergeData(data: ImportEntryData) {
    const res = await fetch('/api/import/conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conflict.id, resolution: 'merged', mergedData: data }),
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error ?? 'Failed to resolve conflict')
    }
  }

  useEffect(() => {
    if (!allSmart || autoApplied.current) return
    autoApplied.current = true
    const mergedData = Object.fromEntries(
      ALL_FIELD_KEYS.map(k => [k, smartSources[k] === 'web' ? web[k] : obs[k]])
    ) as unknown as ImportEntryData
    submitMergeData(mergedData)
      .then(() => onResolved(conflict.id))
      .catch(err => { setError(err.message); setIsResolving(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function applyMerged() {
    setIsResolving(true)
    setError(null)
    try {
      await submitMergeData(combinedValues as unknown as ImportEntryData)
      onResolved(conflict.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — please try again')
      setIsResolving(false)
    }
  }

  // Clicking a source button snaps Combined to that source's value and shows ring
  function selectSource(key: string, source: 'web' | 'obsidian') {
    setFieldSources(prev => ({ ...prev, [key]: source }))
    setCombinedValues(prev => ({ ...prev, [key]: source === 'web' ? web[key as keyof ImportEntryData] : obs[key as keyof ImportEntryData] }))
  }

  // Typing directly clears the ring (neither source is "selected") and updates the buffer
  function editCombined(key: string, value: ImportEntryData[keyof ImportEntryData]) {
    setFieldSources(prev => ({ ...prev, [key]: null }))
    setCombinedValues(prev => ({ ...prev, [key]: value }))
  }

  function setAllSources(source: 'web' | 'obsidian') {
    setFieldSources(Object.fromEntries(ALL_FIELD_KEYS.map(k => [k, source])))
    setCombinedValues(Object.fromEntries(ALL_FIELD_KEYS.map(k => [k, source === 'web' ? web[k] : obs[k]])))
  }

  if (allSmart) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 flex items-center gap-2 text-sm text-zinc-400">
        {error ? (
          <>
            <span className="text-red-600">{error}</span>
            <button
              onClick={() => {
                setIsResolving(true); setError(null)
                const md = Object.fromEntries(ALL_FIELD_KEYS.map(k => [k, smartSources[k] === 'web' ? web[k] : obs[k]])) as unknown as ImportEntryData
                submitMergeData(md).then(() => onResolved(conflict.id)).catch(e => { setError(e.message); setIsResolving(false) })
              }}
              className="ml-2 underline"
            >Retry</button>
          </>
        ) : (
          <span>{isResolving ? `Auto-resolving ${conflict.date}…` : ''}</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{conflict.date}</h3>
        <span className="text-xs text-zinc-400">Conflict</span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-[120px_1fr_1fr_1fr] min-w-[640px]">
          {/* Header */}
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-500 border-b border-r border-zinc-100">Field</div>
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-700 border-b border-r border-zinc-100">Web (current)</div>
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-700 border-b border-r border-zinc-100">Obsidian (import)</div>
          <div className="px-3 py-2 bg-zinc-50 text-xs font-medium text-zinc-700 border-b border-zinc-100">Combined</div>

          {/* Numeric fields */}
          {NUMERIC_FIELDS.map(({ key, label }) => {
            const kind = kinds[key]
            const rowClass = kind === 'conflict' ? 'bg-amber-50' : kind === 'smart' ? 'bg-emerald-50/60' : ''
            const selected = fieldSources[key]
            const numVal = combinedValues[key] as number | null
            return (
              <>
                <div key={`${key}-label`} className={`px-3 py-2 text-xs text-zinc-500 border-b border-r border-zinc-100 ${rowClass}`}>
                  {label}
                </div>
                {kind !== 'same' ? (
                  <>
                    <button
                      key={`${key}-web`}
                      onClick={() => selectSource(key, 'web')}
                      className={`px-3 py-2 text-sm text-zinc-700 border-b border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'web')}`}
                    >

                      {web[key] != null ? String(web[key]) : <span className="text-zinc-300">—</span>}
                    </button>
                    <button
                      key={`${key}-obs`}
                      onClick={() => selectSource(key, 'obsidian')}
                      className={`px-3 py-2 text-sm text-zinc-700 border-b border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'obsidian')}`}
                    >

                      {obs[key] != null ? String(obs[key]) : <span className="text-zinc-300">—</span>}
                    </button>
                  </>
                ) : (
                  <>
                    <div key={`${key}-web`} className={`px-3 py-2 text-sm text-zinc-700 border-b border-r border-zinc-100`}>
                      {web[key] != null ? String(web[key]) : <span className="text-zinc-300">—</span>}
                    </div>
                    <div key={`${key}-obs`} className={`px-3 py-2 text-sm text-zinc-700 border-b border-r border-zinc-100`}>
                      {obs[key] != null ? String(obs[key]) : <span className="text-zinc-300">—</span>}
                    </div>
                  </>
                )}
                <div key={`${key}-combined`} className={`px-2 py-1.5 border-b border-zinc-100 ${rowClass}`}>
                  <input
                    type="number"
                    step="any"
                    value={numVal ?? ''}
                    onChange={e => editCombined(key, e.target.value !== '' ? Number(e.target.value) : null)}
                    placeholder="—"
                    className="w-full text-sm text-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-blue-300 rounded px-1 py-0.5 placeholder:text-zinc-300"
                  />
                </div>
              </>
            )
          })}

          {/* Tags row */}
          {(() => {
            const kind = kinds['tags']
            const rowClass = kind === 'conflict' ? 'bg-amber-50' : kind === 'smart' ? 'bg-emerald-50/60' : ''
            const selected = fieldSources['tags']
            const combinedTags = combinedValues['tags'] as string[]
            return (
              <>
                <div className={`px-3 py-2 text-xs text-zinc-500 border-b border-r border-zinc-100 ${rowClass}`}>Tags</div>
                {kind !== 'same' ? (
                  <>
                    <button
                      onClick={() => selectSource('tags', 'web')}
                      className={`px-3 py-2 border-b border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'web')}`}
                    >

                      <TagChips tags={web.tags ?? []} />
                    </button>
                    <button
                      onClick={() => selectSource('tags', 'obsidian')}
                      className={`px-3 py-2 border-b border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'obsidian')}`}
                    >

                      <TagChips tags={obs.tags ?? []} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`px-3 py-2 border-b border-r border-zinc-100`}>
                      <TagChips tags={web.tags ?? []} />
                    </div>
                    <div className={`px-3 py-2 border-b border-r border-zinc-100`}>
                      <TagChips tags={obs.tags ?? []} />
                    </div>
                  </>
                )}
                <div className={`px-2 py-1.5 border-b border-zinc-100 ${rowClass}`}>
                  <input
                    type="text"
                    value={combinedTags.join(', ')}
                    onChange={e => editCombined('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="tag1, tag2"
                    className="w-full text-xs text-zinc-700 bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-blue-300 rounded px-1 py-0.5 placeholder:text-zinc-300"
                  />
                </div>
              </>
            )
          })()}

          {/* Text fields */}
          {TEXT_FIELDS.map(({ key, label }) => {
            const kind = kinds[key]
            const rowClass = kind === 'conflict' ? 'bg-amber-50' : kind === 'smart' ? 'bg-emerald-50/60' : ''
            const isLast = key === 'more'
            const borderClass = isLast ? '' : 'border-b'
            const selected = fieldSources[key]
            const textVal = (combinedValues[key] as string | null) ?? ''
            return (
              <>
                <div key={`${key}-label`} className={`px-3 py-2 text-xs text-zinc-500 ${borderClass} border-r border-zinc-100 ${rowClass}`}>
                  {label}
                </div>
                {kind !== 'same' ? (
                  <>
                    <button
                      key={`${key}-web`}
                      onClick={() => selectSource(key, 'web')}
                      className={`px-3 py-2 ${borderClass} border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'web')}`}
                    >

                      {web[key] ? (
                        <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{web[key] as string}</pre>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </button>
                    <button
                      key={`${key}-obs`}
                      onClick={() => selectSource(key, 'obsidian')}
                      className={`px-3 py-2 ${borderClass} border-r border-zinc-100 text-left transition-colors ${selClass(kind, selected === 'obsidian')}`}
                    >

                      {obs[key] ? (
                        <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{obs[key] as string}</pre>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div key={`${key}-web`} className={`px-3 py-2 ${borderClass} border-r border-zinc-100`}>
                      {web[key] ? (
                        <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{web[key] as string}</pre>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </div>
                    <div key={`${key}-obs`} className={`px-3 py-2 ${borderClass} border-r border-zinc-100`}>
                      {obs[key] ? (
                        <pre className="text-xs text-zinc-700 whitespace-pre-wrap max-h-40 overflow-y-auto font-sans">{obs[key] as string}</pre>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </div>
                  </>
                )}
                <div key={`${key}-combined`} className={`flex flex-col px-2 py-1.5 ${borderClass} border-zinc-100 ${rowClass}`}>
                  <textarea
                    value={textVal}
                    onChange={e => editCombined(key, e.target.value || null)}
                    placeholder="—"
                    className="flex-1 min-h-0 w-full text-xs text-zinc-700 font-sans whitespace-pre-wrap resize-none bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-blue-300 rounded px-1 py-0.5 placeholder:text-zinc-300"
                  />
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
            onClick={() => setAllSources('web')}
            className="text-sm px-3 py-1.5 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            All Web
          </button>
          <button
            onClick={() => setAllSources('obsidian')}
            className="text-sm px-3 py-1.5 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            All Obsidian
          </button>
          <button
            onClick={applyMerged}
            disabled={isResolving}
            className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResolving ? '...' : 'Apply'}
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
      <p className="text-sm text-zinc-500">
        {conflicts.length} entr{conflicts.length === 1 ? 'y needs' : 'ies need'} review
      </p>
      {conflicts.map(conflict => (
        <ConflictCard key={conflict.id} conflict={conflict} onResolved={handleResolved} />
      ))}
    </div>
  )
}
