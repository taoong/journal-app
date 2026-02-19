import { describe, it, expect } from 'vitest'
import {
  escapeSearchQuery,
  dateParamSchema,
  searchParamsSchema,
  calendarParamsSchema,
} from '../validation'

describe('escapeSearchQuery', () => {
  it('should escape SQL wildcards', () => {
    expect(escapeSearchQuery('100%')).toBe('100\\%')
    expect(escapeSearchQuery('user_name')).toBe('user\\_name')
  })

  it('should escape single quotes', () => {
    expect(escapeSearchQuery("it's")).toBe("it''s")
    expect(escapeSearchQuery("O'Brien")).toBe("O''Brien")
  })

  it('should escape backslashes', () => {
    expect(escapeSearchQuery('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  it('should escape double quotes', () => {
    expect(escapeSearchQuery('said "hello"')).toBe('said \\"hello\\"')
  })

  it('should handle multiple special characters', () => {
    expect(escapeSearchQuery("100% of user_name's")).toBe("100\\% of user\\_name''s")
  })

  it('should return normal text unchanged', () => {
    expect(escapeSearchQuery('normal text')).toBe('normal text')
    expect(escapeSearchQuery('Hello World')).toBe('Hello World')
  })
})

describe('dateParamSchema', () => {
  it('should accept valid date format', () => {
    expect(dateParamSchema.parse('2024-01-15')).toBe('2024-01-15')
    expect(dateParamSchema.parse('2024-12-31')).toBe('2024-12-31')
    expect(dateParamSchema.parse('2025-06-01')).toBe('2025-06-01')
  })

  it('should reject invalid formats', () => {
    expect(() => dateParamSchema.parse('01-15-2024')).toThrow()
    expect(() => dateParamSchema.parse('2024/01/15')).toThrow()
    expect(() => dateParamSchema.parse('2024-1-15')).toThrow()
    expect(() => dateParamSchema.parse('Jan 15, 2024')).toThrow()
    expect(() => dateParamSchema.parse('')).toThrow()
  })
})

describe('searchParamsSchema', () => {
  it('should parse valid search params', () => {
    const result = searchParamsSchema.parse({
      q: 'test query',
      tag: 'work',
      minP: '5',
      maxP: '10',
      limit: '25',
      offset: '10',
    })

    expect(result.q).toBe('test query')
    expect(result.tag).toBe('work')
    expect(result.minP).toBe(5)
    expect(result.maxP).toBe(10)
    expect(result.limit).toBe(25)
    expect(result.offset).toBe(10)
  })

  it('should use default values', () => {
    const result = searchParamsSchema.parse({})

    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('should reject invalid score values', () => {
    expect(() => searchParamsSchema.parse({ minP: '0' })).toThrow()
    expect(() => searchParamsSchema.parse({ minP: '11' })).toThrow()
    expect(() => searchParamsSchema.parse({ maxL: '-1' })).toThrow()
  })

  it('should reject queries that are too long', () => {
    const longQuery = 'a'.repeat(501)
    expect(() => searchParamsSchema.parse({ q: longQuery })).toThrow()
  })

  it('should reject invalid limit values', () => {
    expect(() => searchParamsSchema.parse({ limit: '0' })).toThrow()
    expect(() => searchParamsSchema.parse({ limit: '101' })).toThrow()
  })

  it('should reject negative offset', () => {
    expect(() => searchParamsSchema.parse({ offset: '-1' })).toThrow()
  })

  it('should validate date formats', () => {
    const result = searchParamsSchema.parse({
      from: '2024-01-01',
      to: '2024-12-31',
    })

    expect(result.from).toBe('2024-01-01')
    expect(result.to).toBe('2024-12-31')
  })

  it('should reject invalid date formats', () => {
    expect(() => searchParamsSchema.parse({ from: '2024-1-1' })).toThrow()
    expect(() => searchParamsSchema.parse({ to: 'invalid' })).toThrow()
  })
})

describe('calendarParamsSchema', () => {
  it('should accept valid date', () => {
    const result = calendarParamsSchema.parse({ date: '2024-06-15' })
    expect(result.date).toBe('2024-06-15')
  })

  it('should require date field', () => {
    expect(() => calendarParamsSchema.parse({})).toThrow()
  })

  it('should reject invalid date format', () => {
    expect(() => calendarParamsSchema.parse({ date: '06-15-2024' })).toThrow()
    expect(() => calendarParamsSchema.parse({ date: null })).toThrow()
  })
})
