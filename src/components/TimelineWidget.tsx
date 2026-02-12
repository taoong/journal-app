'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { MapPin, Maximize2, Clock } from 'lucide-react'
import Link from 'next/link'
import type { ParsedBullet, TimeOfDay } from '@/lib/parse-bullets'
import { formatTimeDisplay } from '@/lib/parse-bullets'

export interface PlaceVisit {
  name: string
  address: string
  lat: number
  lng: number
  startTime: string
  endTime: string
  duration: number
}

interface TimelineWidgetProps {
  date: string
  places: PlaceVisit[]
  bullets: ParsedBullet[]
  compact?: boolean
}

// Default timeline bounds (6am to midnight)
const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 24    // Midnight (24 = 0 next day)

// Minimum start hour (can extend to show early morning as late night)
const MIN_START_HOUR = 6
// Maximum end hour (can extend past midnight into early morning next day)
const MAX_END_HOUR = 30        // 6am next day

// Color palette for locations
const LOCATION_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
]

function getLocationColor(index: number): string {
  return LOCATION_COLORS[index % LOCATION_COLORS.length]
}

/**
 * Convert a Date or ISO string to logical hours (early morning becomes 24-30)
 */
function getLogicalHoursFromDate(time: Date | string): number {
  const date = typeof time === 'string' ? new Date(time) : time
  let hours = date.getHours() + date.getMinutes() / 60
  // Treat early morning (midnight-6am) as late night (hours 24-30)
  if (hours < MIN_START_HOUR) {
    hours += 24
  }
  return hours
}

/**
 * Convert a TimeOfDay to logical hours (early morning becomes 24-30)
 */
function getLogicalHoursFromTimeOfDay(time: TimeOfDay): number {
  let hours = time.hours + time.minutes / 60
  // Treat early morning (midnight-6am) as late night (hours 24-30)
  if (hours < MIN_START_HOUR) {
    hours += 24
  }
  return hours
}

/**
 * Convert a Date or ISO string to percentage position on timeline
 */
function timeToPercent(time: Date | string, startHour: number, endHour: number): number {
  const hours = getLogicalHoursFromDate(time)
  const timelineHours = endHour - startHour
  const percent = ((hours - startHour) / timelineHours) * 100
  return Math.max(0, Math.min(100, percent))
}

/**
 * Convert a TimeOfDay object to percentage position on timeline
 */
function timeOfDayToPercent(time: TimeOfDay, startHour: number, endHour: number): number {
  const hours = getLogicalHoursFromTimeOfDay(time)
  const timelineHours = endHour - startHour
  const percent = ((hours - startHour) / timelineHours) * 100
  return Math.max(0, Math.min(100, percent))
}

/**
 * Convert percentage position to time
 * Handles late-night hours (24-30) which represent the next calendar day
 */
function percentToTime(percent: number, baseDate: Date, startHour: number, endHour: number): Date {
  const timelineHours = endHour - startHour
  let hours = startHour + (percent / 100) * timelineHours
  const result = new Date(baseDate)

  // If hours >= 24, it's the next calendar day
  if (hours >= 24) {
    result.setDate(result.getDate() + 1)
    hours -= 24
  }

  result.setHours(Math.floor(hours), Math.round((hours % 1) * 60), 0, 0)
  return result
}

/**
 * Format time for display
 */
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Generate time labels for the timeline based on range
 */
function generateTimeLabels(startHour: number, endHour: number): number[] {
  const labels: number[] = []
  // Round start to nearest 3-hour mark
  const firstLabel = Math.ceil(startHour / 3) * 3
  for (let hour = firstLabel; hour <= endHour; hour += 3) {
    labels.push(hour)
  }
  return labels
}

export default function TimelineWidget({
  date,
  places,
  bullets,
  compact = true,
}: TimelineWidgetProps) {
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Manual overrides when clicking on bullets/locations directly
  const [manualBulletIndex, setManualBulletIndex] = useState<number | null>(null)
  const [manualLocationIndex, setManualLocationIndex] = useState<number | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const bulletsContainerRef = useRef<HTMLDivElement>(null)
  const bulletRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // Sort places chronologically by logical time (early AM treated as late night)
  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => getLogicalHoursFromDate(a.startTime) - getLogicalHoursFromDate(b.startTime))
  }, [places])

  // Sort bullets by their actual/inferred time
  const sortedBullets = useMemo(() => {
    return [...bullets].sort((a, b) => {
      // Use timeStart for sorting - this avoids timezone issues
      const aHours = a.timeStart ? getLogicalHoursFromTimeOfDay(a.timeStart) : 12 // Default to noon if no time
      const bHours = b.timeStart ? getLogicalHoursFromTimeOfDay(b.timeStart) : 12
      return aHours - bHours
    })
  }, [bullets])

  // Calculate dynamic timeline range based on data
  const { timelineStartHour, timelineEndHour } = useMemo(() => {
    let minHour = DEFAULT_END_HOUR // Start high, find minimum
    let maxHour = DEFAULT_START_HOUR // Start low, find maximum

    // Check all places
    for (const place of places) {
      const startHours = getLogicalHoursFromDate(place.startTime)
      const endHours = getLogicalHoursFromDate(place.endTime)
      minHour = Math.min(minHour, startHours)
      maxHour = Math.max(maxHour, endHours)
    }

    // Check all bullets with times
    for (const bullet of bullets) {
      if (bullet.timeStart) {
        const hours = getLogicalHoursFromTimeOfDay(bullet.timeStart)
        minHour = Math.min(minHour, hours)
        maxHour = Math.max(maxHour, hours + 0.5) // Add 30 min buffer for bullet
      }
    }

    // Apply defaults if no data found
    if (minHour > maxHour) {
      minHour = DEFAULT_START_HOUR
      maxHour = DEFAULT_END_HOUR
    }

    // Clamp to allowed range and apply defaults
    const startHour = Math.max(MIN_START_HOUR, Math.min(minHour, DEFAULT_START_HOUR))
    const endHour = Math.min(MAX_END_HOUR, Math.max(maxHour, DEFAULT_END_HOUR))

    return { timelineStartHour: startHour, timelineEndHour: endHour }
  }, [places, bullets])

  // Generate time labels based on dynamic range
  const timeLabels = useMemo(() => {
    return generateTimeLabels(timelineStartHour, timelineEndHour)
  }, [timelineStartHour, timelineEndHour])

  const baseDate = useMemo(() => new Date(date + 'T00:00:00'), [date])

  // Calculate current time for indicator
  const currentTime = useMemo(() => {
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    if (date === today) {
      return timeToPercent(now, timelineStartHour, timelineEndHour)
    }
    return null
  }, [date, timelineStartHour, timelineEndHour])

  // Derive active bullet/location from scrub position (using useMemo instead of useEffect)
  const { activeBulletIndex, activeLocationIndex } = useMemo(() => {
    // If there's a manual override, use that
    if (manualBulletIndex !== null || manualLocationIndex !== null) {
      return {
        activeBulletIndex: manualBulletIndex,
        activeLocationIndex: manualLocationIndex,
      }
    }

    if (scrubPosition === null) {
      return { activeBulletIndex: null, activeLocationIndex: null }
    }

    const scrubTime = percentToTime(scrubPosition, baseDate, timelineStartHour, timelineEndHour)

    // Find matching bullets by comparing scrub position with bullet timeStart
    const timelineHours = timelineEndHour - timelineStartHour
    const scrubHours = timelineStartHour + (scrubPosition / 100) * timelineHours
    const adjustedScrubHours = scrubHours >= 24 ? scrubHours - 24 : scrubHours

    const matchingBullet = sortedBullets.find(bullet => {
      if (!bullet.timeStart) return false
      const bulletHours = bullet.timeStart.hours + bullet.timeStart.minutes / 60
      // Check if within 30 minutes before or after
      return Math.abs(bulletHours - adjustedScrubHours) <= 0.5 ||
        // Handle wraparound at midnight
        Math.abs((bulletHours + 24) - adjustedScrubHours) <= 0.5 ||
        Math.abs(bulletHours - (adjustedScrubHours + 24)) <= 0.5
    })
    const bulletIdx = matchingBullet ? matchingBullet.index : null

    // Find matching location
    const scrubMs = scrubTime.getTime()
    const locationIdx = sortedPlaces.findIndex(place => {
      const start = new Date(place.startTime).getTime()
      const end = new Date(place.endTime).getTime()
      return scrubMs >= start && scrubMs <= end
    })

    return {
      activeBulletIndex: bulletIdx,
      activeLocationIndex: locationIdx >= 0 ? locationIdx : null,
    }
  }, [scrubPosition, sortedBullets, sortedPlaces, baseDate, manualBulletIndex, manualLocationIndex, timelineStartHour, timelineEndHour])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    setIsDragging(true)
    // Clear manual overrides when scrubbing
    setManualBulletIndex(null)
    setManualLocationIndex(null)
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Auto-scroll to active bullet when scrubbing
  useEffect(() => {
    if (activeBulletIndex === null || !isDragging) return

    const bulletEl = bulletRefs.current.get(activeBulletIndex)
    if (bulletEl && bulletsContainerRef.current) {
      bulletEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeBulletIndex, isDragging])

  // Handle touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!timelineRef.current) return
    // Clear manual overrides when scrubbing
    setManualBulletIndex(null)
    setManualLocationIndex(null)
    const rect = timelineRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const percent = ((touch.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const percent = ((touch.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Click on a bullet to jump to its time
  const handleBulletClick = useCallback((bullet: ParsedBullet) => {
    if (bullet.timeStart) {
      setScrubPosition(timeOfDayToPercent(bullet.timeStart, timelineStartHour, timelineEndHour))
    }
    setManualBulletIndex(bullet.index)
    setManualLocationIndex(null)
  }, [timelineStartHour, timelineEndHour])

  // Click on a location to jump to it
  const handleLocationClick = useCallback((index: number) => {
    const place = sortedPlaces[index]
    if (!place) return
    setScrubPosition(timeToPercent(place.startTime, timelineStartHour, timelineEndHour))
    setManualLocationIndex(index)
    setManualBulletIndex(null)
  }, [sortedPlaces, timelineStartHour, timelineEndHour])

  if (places.length === 0 && sortedBullets.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-700">
          <MapPin className="w-4 h-4" />
          <span className="font-medium text-sm">Timeline</span>
          {places.length > 0 && (
            <span className="text-xs text-zinc-400">
              {places.length} location{places.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!compact && (
          <Link
            href={`/entries/${date}/timeline`}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Timeline Scrubber */}
      <div className="px-4 py-4">
        {/* Time Labels */}
        <div className="flex justify-between text-xs text-zinc-400 mb-2 px-0.5">
          {timeLabels.map(hour => {
            // Handle hours >= 24 (next day)
            const displayHour = hour >= 24 ? hour - 24 : hour
            return (
              <span key={hour}>
                {displayHour === 0 ? '12am' : displayHour === 12 ? '12pm' : displayHour > 12 ? `${displayHour - 12}pm` : `${displayHour}am`}
              </span>
            )
          })}
        </div>

        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-10 bg-zinc-100 rounded-lg cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Location bars */}
          {sortedPlaces.map((place, index) => {
            const startPercent = timeToPercent(place.startTime, timelineStartHour, timelineEndHour)
            const endPercent = timeToPercent(place.endTime, timelineStartHour, timelineEndHour)
            const width = Math.max(endPercent - startPercent, 2)
            const isActive = activeLocationIndex === index

            return (
              <div
                key={`${place.name}-${index}`}
                className={`absolute top-1 bottom-1 rounded transition-all ${getLocationColor(index)} ${
                  isActive ? 'ring-2 ring-offset-1 ring-zinc-900 opacity-100' : 'opacity-70 hover:opacity-90'
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${width}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleLocationClick(index)
                }}
                title={`${place.name}\n${formatTime(place.startTime)} - ${formatTime(place.endTime)}`}
              />
            )
          })}

          {/* Bullet position markers */}
          {sortedBullets.map((bullet) => {
            if (!bullet.timeStart) return null
            const percent = timeOfDayToPercent(bullet.timeStart, timelineStartHour, timelineEndHour)
            const isActive = activeBulletIndex === bullet.index
            // Color based on section
            const markerColor = bullet.section === 'morning'
              ? 'bg-amber-400'
              : bullet.section === 'afternoon'
              ? 'bg-blue-400'
              : 'bg-purple-400'

            return (
              <div
                key={`marker-${bullet.index}`}
                className={`absolute top-0 w-0.5 rounded-b transition-all ${markerColor} ${
                  isActive ? 'opacity-100 h-3' : 'opacity-50 h-2'
                }`}
                style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
              />
            )
          })}

          {/* Current time indicator (if today) */}
          {currentTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${currentTime}%` }}
            />
          )}

          {/* Scrub indicator */}
          {scrubPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 z-20"
              style={{ left: `${scrubPosition}%` }}
            >
              {/* Scrub handle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 rounded-full shadow" />
              {/* Time tooltip */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-zinc-700 whitespace-nowrap">
                {formatTime(percentToTime(scrubPosition, baseDate, timelineStartHour, timelineEndHour))}
              </div>
            </div>
          )}
        </div>

        {/* Location Legend (below timeline) */}
        {sortedPlaces.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-2">
            {sortedPlaces.map((place, index) => {
              const isActive = activeLocationIndex === index
              return (
                <button
                  key={`${place.name}-${index}`}
                  onClick={() => handleLocationClick(index)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getLocationColor(index)}`} />
                  <span className="truncate max-w-[120px]">{place.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bullets Section */}
      {sortedBullets.length > 0 && compact && (
        <div ref={bulletsContainerRef} className="px-4 pb-4 border-t border-zinc-100 pt-3 max-h-48 overflow-y-auto">
          <div className="space-y-1">
            {sortedBullets.map((bullet) => {
              const isActive = activeBulletIndex === bullet.index
              const hasTime = bullet.timeStart !== undefined

              return (
                <button
                  key={bullet.index}
                  ref={(el) => {
                    if (el) bulletRefs.current.set(bullet.index, el)
                    else bulletRefs.current.delete(bullet.index)
                  }}
                  onClick={() => handleBulletClick(bullet)}
                  className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                    isActive ? 'bg-white' : hasTime ? 'bg-zinc-900' : 'bg-zinc-300'
                  }`} />
                  <div className="min-w-0 flex-1">
                    {hasTime && bullet.timeStart && (
                      <span className={`text-xs mr-1.5 ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        {formatTimeDisplay(bullet.timeStart)}
                      </span>
                    )}
                    <span className="text-sm truncate">{bullet.text}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Location Details */}
      {activeLocationIndex !== null && sortedPlaces[activeLocationIndex] && (
        <div className="px-4 pb-4 border-t border-zinc-100 pt-3">
          <div className="flex items-start gap-2">
            <div className={`w-3 h-3 rounded-full mt-0.5 ${getLocationColor(activeLocationIndex)}`} />
            <div className="min-w-0">
              <div className="font-medium text-zinc-900">
                {sortedPlaces[activeLocationIndex].name}
              </div>
              {sortedPlaces[activeLocationIndex].address && (
                <div className="text-sm text-zinc-500 truncate">
                  {sortedPlaces[activeLocationIndex].address}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                <Clock className="w-3 h-3" />
                {formatTime(sortedPlaces[activeLocationIndex].startTime)} - {formatTime(sortedPlaces[activeLocationIndex].endTime)}
                <span className="text-zinc-300 mx-1">·</span>
                {sortedPlaces[activeLocationIndex].duration} min
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
