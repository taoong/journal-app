import { z } from 'zod'

/**
 * Escape special characters for use in Supabase .or() filters
 * This prevents SQL injection via ilike patterns
 */
export function escapeSearchQuery(query: string): string {
  // Escape special regex/SQL characters that could be used for injection
  return query
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%')   // Escape % wildcard
    .replace(/_/g, '\\_')   // Escape _ wildcard
    .replace(/'/g, "''")    // Escape single quotes (SQL)
    .replace(/"/g, '\\"')   // Escape double quotes
}

// Date format validation (YYYY-MM-DD)
export const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')

// Search API params
export const searchParamsSchema = z.object({
  q: z.string().max(500).optional(),
  tag: z.string().max(100).optional(),
  minP: z.coerce.number().int().min(1).max(10).optional(),
  maxP: z.coerce.number().int().min(1).max(10).optional(),
  minL: z.coerce.number().int().min(1).max(10).optional(),
  maxL: z.coerce.number().int().min(1).max(10).optional(),
  from: dateParamSchema.optional(),
  to: dateParamSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// Calendar API params
export const calendarParamsSchema = z.object({
  date: dateParamSchema,
})

// Entry page search params
export const entryPageParamsSchema = z.object({
  view: z.enum(['calendar', 'list']).optional(),
  q: z.string().max(500).optional(),
  tag: z.string().max(100).optional(),
  from: dateParamSchema.optional(),
  to: dateParamSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  incomplete: z.string().optional(),
})
