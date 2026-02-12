/**
 * Bulletpoint parser for extracting time information from journal entries
 */

export interface TimeOfDay {
  hours: number
  minutes: number
}

export interface ParsedBullet {
  text: string
  rawText: string
  timeStart?: TimeOfDay
  timeEnd?: TimeOfDay
  estimatedTimeRange: [Date, Date]
  section: 'morning' | 'afternoon' | 'night'
  index: number
}

/**
 * Format a TimeOfDay object for display (e.g., "8:45 PM" or "12 PM")
 */
export function formatTimeDisplay(time: TimeOfDay): string {
  const hour12 = time.hours % 12 || 12
  const ampm = time.hours >= 12 ? 'PM' : 'AM'
  const mins = time.minutes.toString().padStart(2, '0')
  return mins === '00' ? `${hour12} ${ampm}` : `${hour12}:${mins} ${ampm}`
}

export interface ParsedEntry {
  morning: ParsedBullet[]
  afternoon: ParsedBullet[]
  night: ParsedBullet[]
  all: ParsedBullet[]
}

// Time range defaults for each section
const SECTION_RANGES = {
  morning: { start: 6, end: 12 },    // 6am - 12pm
  afternoon: { start: 12, end: 18 }, // 12pm - 6pm
  night: { start: 18, end: 23 },     // 6pm - 11pm
} as const

/**
 * Interpolate times for bullets without explicit times based on surrounding anchors
 * Bullets with explicit times act as "anchors", and bullets without times get
 * evenly distributed times between anchors.
 */
function interpolateTimes(
  bullets: ParsedBullet[],
  sectionRange: { start: number; end: number },
  date: Date
): void {
  if (bullets.length === 0) return

  // Find indices of bullets with explicit times (anchors)
  const anchors: { index: number; hours: number }[] = []
  bullets.forEach((b, i) => {
    if (b.timeStart) {
      anchors.push({ index: i, hours: b.timeStart.hours + b.timeStart.minutes / 60 })
    }
  })

  // Helper to set interpolated time on a bullet
  const setInterpolatedTime = (bullet: ParsedBullet, hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    // Handle minute overflow (e.g., 59.5 rounds to 60)
    const adjustedHours = minutes >= 60 ? wholeHours + 1 : wholeHours
    const adjustedMinutes = minutes >= 60 ? 0 : minutes

    bullet.timeStart = { hours: adjustedHours, minutes: adjustedMinutes }

    // Update estimatedTimeRange based on new interpolated time
    const estimatedStart = new Date(date)
    estimatedStart.setHours(adjustedHours, adjustedMinutes, 0, 0)
    const estimatedEnd = new Date(estimatedStart.getTime() + 60 * 60 * 1000)
    bullet.estimatedTimeRange = [estimatedStart, estimatedEnd]
  }

  if (anchors.length === 0) {
    // No anchors - distribute evenly across section
    const step = (sectionRange.end - sectionRange.start) / (bullets.length + 1)
    bullets.forEach((b, i) => {
      const hours = sectionRange.start + step * (i + 1)
      setInterpolatedTime(b, hours)
    })
    return
  }

  // Fill gaps between anchors

  // 1. Before first anchor - extrapolate backward from first anchor
  if (anchors[0].index > 0) {
    const endHours = anchors[0].hours
    const startHours = sectionRange.start
    const count = anchors[0].index
    const step = (endHours - startHours) / (count + 1)
    for (let i = 0; i < anchors[0].index; i++) {
      const hours = startHours + step * (i + 1)
      setInterpolatedTime(bullets[i], hours)
    }
  }

  // 2. Between anchors
  for (let a = 0; a < anchors.length - 1; a++) {
    const startIdx = anchors[a].index
    const endIdx = anchors[a + 1].index
    const startHours = anchors[a].hours
    const endHours = anchors[a + 1].hours
    const gapCount = endIdx - startIdx - 1

    if (gapCount > 0) {
      const step = (endHours - startHours) / (gapCount + 1)
      for (let i = startIdx + 1; i < endIdx; i++) {
        const hours = startHours + step * (i - startIdx)
        setInterpolatedTime(bullets[i], hours)
      }
    }
  }

  // 3. After last anchor - extrapolate forward from last anchor
  const lastAnchor = anchors[anchors.length - 1]
  if (lastAnchor.index < bullets.length - 1) {
    const startHours = lastAnchor.hours
    const endHours = sectionRange.end
    const count = bullets.length - 1 - lastAnchor.index
    const step = (endHours - startHours) / (count + 1)
    for (let i = lastAnchor.index + 1; i < bullets.length; i++) {
      const hours = startHours + step * (i - lastAnchor.index)
      setInterpolatedTime(bullets[i], hours)
    }
  }
}

/**
 * Parse a time string like "9am", "2:30pm", "14:00" into hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  // Handle 24-hour format (14:00, 9:30)
  const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10)
    const minutes = parseInt(time24Match[2], 10)
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes }
    }
  }

  // Handle 12-hour format (9am, 2:30pm, 9:30 am)
  const time12Match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (time12Match) {
    let hours = parseInt(time12Match[1], 10)
    const minutes = time12Match[2] ? parseInt(time12Match[2], 10) : 0
    const period = time12Match[3].toLowerCase()

    if (hours < 1 || hours > 12) return null
    if (minutes < 0 || minutes > 59) return null

    if (period === 'pm' && hours !== 12) {
      hours += 12
    } else if (period === 'am' && hours === 12) {
      hours = 0
    }

    return { hours, minutes }
  }

  return null
}

/**
 * Extract time from anywhere in text (not just prefix) and infer AM/PM from section
 * Examples:
 *   "woke up at 7:30" in morning section -> 7:30 AM
 *   "meeting at 3" in afternoon section -> 3:00 PM
 *   "dinner at 7:30" in night section -> 7:30 PM
 */
function extractTimeFromText(
  text: string,
  section: 'morning' | 'afternoon' | 'night'
): { hours: number; minutes: number } | null {
  // First try explicit AM/PM times anywhere in text
  const explicitMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  if (explicitMatch) {
    return parseTimeString(explicitMatch[0].replace(/\s/g, ''))
  }

  // Then try bare times like "7:30" or "at 7" and infer AM/PM from section
  // Use word boundary to avoid matching numbers in other contexts
  // Use negative lookahead to exclude ratings like "4/10" or fractions
  const bareTimeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?(?!\/\d)\b/)
  if (bareTimeMatch) {
    const hours = parseInt(bareTimeMatch[1], 10)
    const minutes = bareTimeMatch[2] ? parseInt(bareTimeMatch[2], 10) : 0

    // Only consider valid clock times (1-12 for bare numbers, or with valid minutes)
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      // Infer AM/PM based on section
      const isPM = section === 'afternoon' || section === 'night'
      let actualHours = hours
      if (isPM && hours !== 12) actualHours += 12
      if (!isPM && hours === 12) actualHours = 0
      return { hours: actualHours, minutes }
    }
  }

  return null
}

/**
 * Extract time prefix from a bullet point text
 * Examples:
 *   "9am - Had coffee" -> { start: 9am, end: null, rest: "Had coffee" }
 *   "9-11am - Meeting" -> { start: 9am, end: 11am, rest: "Meeting" }
 *   "9:30am Had coffee" -> { start: 9:30am, end: null, rest: "Had coffee" }
 */
function extractTimePrefix(text: string): {
  startTime: { hours: number; minutes: number } | null
  endTime: { hours: number; minutes: number } | null
  rest: string
} {
  const trimmed = text.trim()

  // Pattern 1: Range with shared meridiem "9-11am" or "9:30-11:30pm"
  const rangeSharedMatch = trimmed.match(/^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*[-–:]?\s*(.*)$/i)
  if (rangeSharedMatch) {
    const meridiem = rangeSharedMatch[3]
    const startTime = parseTimeString(rangeSharedMatch[1] + meridiem)
    const endTime = parseTimeString(rangeSharedMatch[2] + meridiem)
    return { startTime, endTime, rest: rangeSharedMatch[4] }
  }

  // Pattern 2: Range with both meridiems "9am-2pm" or "9:30am - 2:30pm"
  const rangeFullMatch = trimmed.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–:]?\s*(.*)$/i)
  if (rangeFullMatch) {
    const startTime = parseTimeString(rangeFullMatch[1].replace(/\s/g, ''))
    const endTime = parseTimeString(rangeFullMatch[2].replace(/\s/g, ''))
    return { startTime, endTime, rest: rangeFullMatch[3] }
  }

  // Pattern 3: Single time "9am -" or "9:30am:" or "9am "
  const singleMatch = trimmed.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–:]?\s*(.*)$/i)
  if (singleMatch) {
    const startTime = parseTimeString(singleMatch[1].replace(/\s/g, ''))
    return { startTime, endTime: null, rest: singleMatch[2] }
  }

  // Pattern 4: 24-hour time "14:00 -" or "9:30:"
  const time24Match = trimmed.match(/^(\d{1,2}:\d{2})\s*[-–:]?\s*(.*)$/)
  if (time24Match) {
    const startTime = parseTimeString(time24Match[1])
    return { startTime, endTime: null, rest: time24Match[2] }
  }

  return { startTime: null, endTime: null, rest: trimmed }
}

/**
 * Parse a section of text (morning/afternoon/night) into bullet points
 */
function parseSection(
  text: string | undefined | null,
  section: 'morning' | 'afternoon' | 'night',
  date: Date,
  startIndex: number
): ParsedBullet[] {
  if (!text) return []

  const bullets: ParsedBullet[] = []
  const range = SECTION_RANGES[section]

  // Split by newlines and filter out empty lines
  const lines = text.split('\n').filter(line => line.trim())

  lines.forEach((line) => {
    // Remove leading bullet characters
    const cleanedLine = line.replace(/^[\s]*[-•*]\s*/, '').trim()
    if (!cleanedLine) return

    const { startTime, endTime, rest } = extractTimePrefix(cleanedLine)

    // Store times as simple {hours, minutes} objects to avoid timezone issues
    let timeStart: TimeOfDay | undefined
    let timeEnd: TimeOfDay | undefined
    let extractedTime: { hours: number; minutes: number } | null = null

    if (startTime) {
      timeStart = startTime
      extractedTime = startTime
    } else {
      // Try to extract time from anywhere in the text
      extractedTime = extractTimeFromText(cleanedLine, section)
      if (extractedTime) {
        timeStart = extractedTime
      }
    }

    if (endTime) {
      timeEnd = endTime
    }

    // Calculate estimated time range
    let estimatedStart: Date
    let estimatedEnd: Date

    if (extractedTime) {
      // If we found a time, use it as the center of the range (±30 min)
      estimatedStart = new Date(date)
      estimatedStart.setHours(extractedTime.hours, extractedTime.minutes, 0, 0)
      estimatedEnd = new Date(estimatedStart.getTime() + 60 * 60 * 1000) // 1 hour later
    } else {
      // No time found, use section midpoint
      const midpoint = (range.start + range.end) / 2
      estimatedStart = new Date(date)
      estimatedStart.setHours(Math.floor(midpoint), (midpoint % 1) * 60, 0, 0)
      estimatedEnd = new Date(estimatedStart.getTime() + 60 * 60 * 1000) // 1 hour later
    }

    bullets.push({
      text: rest || cleanedLine,
      rawText: cleanedLine,
      timeStart,
      timeEnd,
      estimatedTimeRange: [estimatedStart, estimatedEnd],
      section,
      index: startIndex + bullets.length,
    })
  })

  // Interpolate times for bullets without explicit times
  interpolateTimes(bullets, range, date)

  return bullets
}

/**
 * Parse an entire journal entry's morning/afternoon/night sections
 */
export function parseEntry(
  morning: string | undefined | null,
  afternoon: string | undefined | null,
  night: string | undefined | null,
  date: Date | string
): ParsedEntry {
  const entryDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date

  const morningBullets = parseSection(morning, 'morning', entryDate, 0)
  const afternoonBullets = parseSection(afternoon, 'afternoon', entryDate, morningBullets.length)
  const nightBullets = parseSection(night, 'night', entryDate, morningBullets.length + afternoonBullets.length)

  return {
    morning: morningBullets,
    afternoon: afternoonBullets,
    night: nightBullets,
    all: [...morningBullets, ...afternoonBullets, ...nightBullets],
  }
}

/**
 * Find which bullet(s) match a given time
 * Uses estimatedTimeRange for matching since it's always populated
 */
export function findBulletsAtTime(bullets: ParsedBullet[], time: Date): ParsedBullet[] {
  const timeMs = time.getTime()

  return bullets.filter(bullet => {
    // Use estimated range for all matching (it's derived from explicit times when available)
    const [estStart, estEnd] = bullet.estimatedTimeRange
    return timeMs >= estStart.getTime() && timeMs <= estEnd.getTime()
  })
}

/**
 * Get the time range that a bullet covers (uses estimatedTimeRange)
 */
export function getBulletTimeRange(bullet: ParsedBullet): [Date, Date] {
  return bullet.estimatedTimeRange
}
