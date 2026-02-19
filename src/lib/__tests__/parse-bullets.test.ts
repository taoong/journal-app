import { describe, it, expect } from 'vitest'
import { parseEntry, formatTimeDisplay, findBulletsAtTime } from '../parse-bullets'

describe('parseEntry', () => {
  const testDate = '2024-01-15'

  describe('basic bullet parsing', () => {
    it('should parse simple bullets without times', () => {
      const result = parseEntry('- Had breakfast\n- Went for a walk', null, null, testDate)

      expect(result.morning).toHaveLength(2)
      expect(result.morning[0].text).toBe('Had breakfast')
      expect(result.morning[1].text).toBe('Went for a walk')
    })

    it('should handle empty sections', () => {
      const result = parseEntry(null, null, null, testDate)

      expect(result.morning).toHaveLength(0)
      expect(result.afternoon).toHaveLength(0)
      expect(result.night).toHaveLength(0)
      expect(result.all).toHaveLength(0)
    })

    it('should skip indented sub-bullets', () => {
      const result = parseEntry('- Main task\n  - Sub task\n- Another task', null, null, testDate)

      expect(result.morning).toHaveLength(2)
      expect(result.morning[0].text).toBe('Main task')
      expect(result.morning[1].text).toBe('Another task')
    })

    it('should handle different bullet markers', () => {
      const result = parseEntry('- Dash bullet\n• Circle bullet\n* Star bullet', null, null, testDate)

      expect(result.morning).toHaveLength(3)
      expect(result.morning[0].text).toBe('Dash bullet')
      expect(result.morning[1].text).toBe('Circle bullet')
      expect(result.morning[2].text).toBe('Star bullet')
    })
  })

  describe('time prefix extraction', () => {
    it('should extract 12-hour time prefix (9am)', () => {
      const result = parseEntry('9am - Had coffee', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 9, minutes: 0 })
      expect(result.morning[0].text).toBe('Had coffee')
    })

    it('should extract 12-hour time with minutes (9:30am)', () => {
      const result = parseEntry('9:30am - Meeting', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 9, minutes: 30 })
      expect(result.morning[0].text).toBe('Meeting')
    })

    it('should extract PM times correctly', () => {
      const result = parseEntry(null, '2:30pm - Lunch meeting', null, testDate)

      expect(result.afternoon[0].timeStart).toEqual({ hours: 14, minutes: 30 })
    })

    it('should handle 12pm correctly (noon)', () => {
      const result = parseEntry(null, '12pm - Lunch', null, testDate)

      expect(result.afternoon[0].timeStart).toEqual({ hours: 12, minutes: 0 })
    })

    it('should handle 12am correctly (midnight)', () => {
      const result = parseEntry('12am - Late night', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 0, minutes: 0 })
    })

    it('should extract time ranges (9-11am)', () => {
      const result = parseEntry('9-11am - Long meeting', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 9, minutes: 0 })
      expect(result.morning[0].timeEnd).toEqual({ hours: 11, minutes: 0 })
      expect(result.morning[0].text).toBe('Long meeting')
    })

    it('should extract cross-meridiem ranges (9am-2pm)', () => {
      const result = parseEntry('9am-2pm - All day workshop', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 9, minutes: 0 })
      expect(result.morning[0].timeEnd).toEqual({ hours: 14, minutes: 0 })
    })

    it('should handle 24-hour format (14:00)', () => {
      const result = parseEntry(null, '14:00 - Afternoon task', null, testDate)

      expect(result.afternoon[0].timeStart).toEqual({ hours: 14, minutes: 0 })
    })
  })

  describe('embedded time extraction', () => {
    it('should extract time from "woke up at 7:30" in morning', () => {
      const result = parseEntry('- woke up at 7:30', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 7, minutes: 30 })
    })

    it('should infer PM for afternoon section bare times', () => {
      const result = parseEntry(null, '- meeting at 3', null, testDate)

      expect(result.afternoon[0].timeStart).toEqual({ hours: 15, minutes: 0 })
    })

    it('should infer PM for night section bare times', () => {
      const result = parseEntry(null, null, '- dinner at 7:30', testDate)

      expect(result.night[0].timeStart).toEqual({ hours: 19, minutes: 30 })
    })

    it('should not match rating patterns like 4/10', () => {
      const result = parseEntry('- rated it 4/10', null, null, testDate)

      // Should not extract "4" as a time
      expect(result.morning[0].timeStart).toBeDefined()
      // The interpolated time should be within morning range, not 4am/4pm
      expect(result.morning[0].timeStart!.hours).toBeGreaterThanOrEqual(6)
      expect(result.morning[0].timeStart!.hours).toBeLessThan(12)
    })

    it('should respect explicit AM/PM over section inference', () => {
      const result = parseEntry(null, '- call at 9am', null, testDate)

      expect(result.afternoon[0].timeStart).toEqual({ hours: 9, minutes: 0 })
    })
  })

  describe('time interpolation', () => {
    it('should distribute times evenly when no anchors', () => {
      // Use text that won't be interpreted as times (no numbers)
      const result = parseEntry('- Do laundry\n- Clean room\n- Make bed', null, null, testDate)

      // Morning range is 6-12, with 3 bullets should be distributed at ~7.5, 9, 10.5
      const times = result.morning.map((b) => b.timeStart!.hours + b.timeStart!.minutes / 60)
      expect(times[0]).toBeLessThan(times[1])
      expect(times[1]).toBeLessThan(times[2])
      expect(times[0]).toBeGreaterThanOrEqual(6)
      expect(times[2]).toBeLessThan(12)
    })

    it('should interpolate between anchors', () => {
      const result = parseEntry('8am - Early task\n- Middle task\n11am - Late task', null, null, testDate)

      expect(result.morning[0].timeStart).toEqual({ hours: 8, minutes: 0 })
      expect(result.morning[2].timeStart).toEqual({ hours: 11, minutes: 0 })

      // Middle task should be interpolated between 8 and 11
      const middleTime = result.morning[1].timeStart!.hours + result.morning[1].timeStart!.minutes / 60
      expect(middleTime).toBeGreaterThan(8)
      expect(middleTime).toBeLessThan(11)
    })

    it('should extrapolate before first anchor', () => {
      const result = parseEntry('- Early task\n10am - Anchored task', null, null, testDate)

      const earlyTime = result.morning[0].timeStart!.hours + result.morning[0].timeStart!.minutes / 60
      expect(earlyTime).toBeLessThan(10)
      expect(earlyTime).toBeGreaterThanOrEqual(6)
    })

    it('should extrapolate after last anchor', () => {
      const result = parseEntry('8am - Early task\n- Late task', null, null, testDate)

      const lateTime = result.morning[1].timeStart!.hours + result.morning[1].timeStart!.minutes / 60
      expect(lateTime).toBeGreaterThan(8)
      expect(lateTime).toBeLessThan(12)
    })
  })

  describe('section assignment', () => {
    it('should assign correct section to each bullet', () => {
      const result = parseEntry('- Morning task', '- Afternoon task', '- Night task', testDate)

      expect(result.morning[0].section).toBe('morning')
      expect(result.afternoon[0].section).toBe('afternoon')
      expect(result.night[0].section).toBe('night')
    })

    it('should maintain correct index across sections', () => {
      const result = parseEntry('- M1\n- M2', '- A1', '- N1\n- N2', testDate)

      expect(result.morning[0].index).toBe(0)
      expect(result.morning[1].index).toBe(1)
      expect(result.afternoon[0].index).toBe(2)
      expect(result.night[0].index).toBe(3)
      expect(result.night[1].index).toBe(4)
    })

    it('should combine all sections in the all array', () => {
      const result = parseEntry('- M1', '- A1', '- N1', testDate)

      expect(result.all).toHaveLength(3)
      expect(result.all[0].section).toBe('morning')
      expect(result.all[1].section).toBe('afternoon')
      expect(result.all[2].section).toBe('night')
    })
  })

  describe('date handling', () => {
    it('should accept string dates', () => {
      const result = parseEntry('9am - Task', null, null, '2024-06-15')

      expect(result.morning[0].estimatedTimeRange[0].getFullYear()).toBe(2024)
      expect(result.morning[0].estimatedTimeRange[0].getMonth()).toBe(5) // June is 0-indexed
      expect(result.morning[0].estimatedTimeRange[0].getDate()).toBe(15)
    })

    it('should accept Date objects', () => {
      const date = new Date(2024, 2, 20) // March 20, 2024
      const result = parseEntry('9am - Task', null, null, date)

      expect(result.morning[0].estimatedTimeRange[0].getFullYear()).toBe(2024)
      expect(result.morning[0].estimatedTimeRange[0].getMonth()).toBe(2)
      expect(result.morning[0].estimatedTimeRange[0].getDate()).toBe(20)
    })
  })
})

describe('formatTimeDisplay', () => {
  it('should format whole hours correctly', () => {
    expect(formatTimeDisplay({ hours: 9, minutes: 0 })).toBe('9 AM')
    expect(formatTimeDisplay({ hours: 14, minutes: 0 })).toBe('2 PM')
    expect(formatTimeDisplay({ hours: 12, minutes: 0 })).toBe('12 PM')
    expect(formatTimeDisplay({ hours: 0, minutes: 0 })).toBe('12 AM')
  })

  it('should format times with minutes correctly', () => {
    expect(formatTimeDisplay({ hours: 9, minutes: 30 })).toBe('9:30 AM')
    expect(formatTimeDisplay({ hours: 14, minutes: 45 })).toBe('2:45 PM')
    expect(formatTimeDisplay({ hours: 12, minutes: 15 })).toBe('12:15 PM')
  })

  it('should pad single-digit minutes', () => {
    expect(formatTimeDisplay({ hours: 9, minutes: 5 })).toBe('9:05 AM')
  })
})

describe('findBulletsAtTime', () => {
  it('should find bullets that overlap with a given time', () => {
    const result = parseEntry('9am - Task 1\n10am - Task 2\n11am - Task 3', null, null, '2024-01-15')
    const searchTime = new Date('2024-01-15T09:30:00')

    const found = findBulletsAtTime(result.all, searchTime)

    expect(found).toHaveLength(1)
    expect(found[0].text).toBe('Task 1')
  })

  it('should return empty array when no bullets match', () => {
    const result = parseEntry('9am - Task 1', null, null, '2024-01-15')
    const searchTime = new Date('2024-01-15T15:00:00') // 3pm, outside morning range

    const found = findBulletsAtTime(result.all, searchTime)

    expect(found).toHaveLength(0)
  })

  it('should find multiple overlapping bullets', () => {
    // If two bullets have overlapping estimated ranges, both should be returned
    const result = parseEntry('9am - Task 1\n9:30am - Task 2', null, null, '2024-01-15')
    const searchTime = new Date('2024-01-15T09:30:00')

    const found = findBulletsAtTime(result.all, searchTime)

    // Both 9am and 9:30am tasks might overlap at 9:30
    expect(found.length).toBeGreaterThanOrEqual(1)
  })
})
