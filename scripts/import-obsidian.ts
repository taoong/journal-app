#!/usr/bin/env npx tsx

/**
 * Import Obsidian journal entries into the journal app database.
 *
 * Usage: npx tsx scripts/import-obsidian.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and IMPORT_USER_ID environment variables
 * (or reads from .env.local)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'

// Load .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  }
}

const VAULT_PATH = '/Users/taoong/Documents/Tao\'s Brain'
const JOURNAL_SUBDIR = 'Personal/Journal'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID = process.env.IMPORT_USER_ID!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables.')
  console.error('Add to .env.local:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  console.error('  IMPORT_USER_ID=your_user_uuid')
  console.error('')
  console.error('Find service role key in Supabase Dashboard > Settings > API')
  console.error('Find user ID by running: SELECT id FROM auth.users')
  process.exit(1)
}

if (!USER_ID) {
  console.error('Missing IMPORT_USER_ID environment variable')
  console.error('Add to .env.local: IMPORT_USER_ID=your_user_uuid')
  console.error('Find user ID in Supabase Dashboard > Authentication > Users')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ParsedEntry {
  date: string
  p_score: number | null
  l_score: number | null
  weight: number | null
  tags: string[]
  highlights_high: string | null
  highlights_low: string | null
  morning: string | null
  afternoon: string | null
  night: string | null
}

/**
 * Find all markdown files that could be journal entries
 */
function findJournalFiles(): string[] {
  const files: string[] = []

  // Root folder (current month entries)
  const rootFiles = fs.readdirSync(VAULT_PATH)
    .filter(f => f.endsWith('.md') && isJournalFilename(f))
    .map(f => path.join(VAULT_PATH, f))
  files.push(...rootFiles)

  // Archived entries in Personal/Journal/[YYYY Month]/
  const journalPath = path.join(VAULT_PATH, JOURNAL_SUBDIR)
  if (fs.existsSync(journalPath)) {
    const monthFolders = fs.readdirSync(journalPath)
      .filter(f => fs.statSync(path.join(journalPath, f)).isDirectory())

    for (const folder of monthFolders) {
      const folderPath = path.join(journalPath, folder)
      const monthFiles = fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(folderPath, f))
      files.push(...monthFiles)
    }
  }

  return files
}

/**
 * Check if filename looks like a journal entry (e.g., "Feb 9 2026.md", "January 10 2026.md")
 */
function isJournalFilename(filename: string): boolean {
  // Match patterns like "Feb 9 2026.md", "January 10 2026.md", "Sept 1 2024.md"
  return /^[A-Z][a-z]+ \d{1,2} \d{4}\.md$/.test(filename)
}

/**
 * Parse frontmatter and content from a markdown file
 */
function parseJournalFile(filePath: string): ParsedEntry | null {
  const content = fs.readFileSync(filePath, 'utf-8')

  let parsed
  try {
    parsed = matter(content)
  } catch (e) {
    console.warn(`Failed to parse frontmatter in ${filePath}:`, e)
    return null
  }

  const { data: frontmatter, content: markdown } = parsed

  // Get date from frontmatter (required)
  const date = frontmatter.date
  if (!date) {
    console.warn(`Skipping ${filePath}: no date in frontmatter`)
    return null
  }

  // Format date as YYYY-MM-DD
  let dateStr: string
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0]
  } else if (typeof date === 'string') {
    // Already in YYYY-MM-DD format
    dateStr = date
  } else {
    console.warn(`Skipping ${filePath}: invalid date format`)
    return null
  }

  // Parse P-Rating and L-Rating
  let p_score = parseRating(frontmatter['P-Rating'])
  let l_score = parseRating(frontmatter['L-Rating'])

  // Fallback to single 'rating' field if P/L not present
  if (p_score === null && l_score === null && frontmatter.rating) {
    const rating = parseRating(frontmatter.rating)
    // For old format, use rating as both P and L score
    p_score = rating
    l_score = rating
  }

  // Parse weight
  const weight = frontmatter.weight ? parseFloat(String(frontmatter.weight)) : null

  // Parse tags
  const tags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((t: unknown) => typeof t === 'string' && t.trim())
    : []

  // Parse markdown sections
  const sections = parseMarkdownSections(markdown)

  return {
    date: dateStr,
    p_score,
    l_score,
    weight: isNaN(weight!) ? null : weight,
    tags,
    highlights_high: sections.highlights_high,
    highlights_low: sections.highlights_low,
    morning: sections.morning,
    afternoon: sections.afternoon,
    night: sections.night,
  }
}

/**
 * Parse a rating value (can be number or string)
 */
function parseRating(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = parseInt(String(value), 10)
  if (isNaN(num) || num < 1 || num > 10) return null
  return num
}

/**
 * Parse markdown content into sections
 */
function parseMarkdownSections(markdown: string): {
  highlights_high: string | null
  highlights_low: string | null
  morning: string | null
  afternoon: string | null
  night: string | null
} {
  const lines = markdown.split('\n')

  let highlights_high: string[] = []
  let highlights_low: string[] = []
  let more: string[] = []
  let morning: string[] = []
  let afternoon: string[] = []
  let night: string[] = []

  let currentSection: 'none' | 'highs' | 'lows' | 'more' | 'morning' | 'afternoon' | 'night' = 'none'

  for (const line of lines) {
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()

    // Check for section headers
    // Formats: "Highs", "**Highs**", "## Highlights", etc.
    if (lower === 'highs' || lower === '**highs**' || lower.startsWith('highs')) {
      currentSection = 'highs'
      continue
    }
    if (lower === 'lows' || lower === '**lows**' || lower.startsWith('lows')) {
      currentSection = 'lows'
      continue
    }
    if (lower === 'more' || lower === '**more**' || lower.startsWith('more')) {
      currentSection = 'more'
      continue
    }

    // Timeline headers - check for time-based headers
    if (lower === '**morning**' || lower.match(/^\d{1,2}(am|:00|:\d{2}):/i) || lower.startsWith('morning')) {
      currentSection = 'morning'
      // Include the line if it has content after the header
      if (lower.match(/^\d{1,2}(am|:00|:\d{2}):/i)) {
        morning.push(line)
      }
      continue
    }
    if (lower === '**afternoon**' || lower.match(/^\d{1,2}(pm|:00|:\d{2}):/i) && isAfternoonTime(lower)) {
      currentSection = 'afternoon'
      if (lower.match(/^\d{1,2}(pm|:00|:\d{2}):/i)) {
        afternoon.push(line)
      }
      continue
    }
    if (lower === '**evening**' || lower === '**night**' || lower.match(/^\d{1,2}(pm|:00|:\d{2}):/i) && isEveningTime(lower)) {
      currentSection = 'night'
      if (lower.match(/^\d{1,2}(pm|:00|:\d{2}):/i)) {
        night.push(line)
      }
      continue
    }

    // Skip section headers like "## Highlights", "## Timeline"
    if (trimmed.startsWith('## ')) continue

    // Add content to current section
    switch (currentSection) {
      case 'highs':
        highlights_high.push(line)
        break
      case 'lows':
        highlights_low.push(line)
        break
      case 'more':
        more.push(line)
        break
      case 'morning':
        morning.push(line)
        break
      case 'afternoon':
        afternoon.push(line)
        break
      case 'night':
        night.push(line)
        break
    }
  }

  // Combine highlights_high with "more" section
  const combined_high = [...highlights_high]
  if (more.length > 0 && more.some(l => l.trim())) {
    combined_high.push('', '---', '', ...more)
  }

  return {
    highlights_high: cleanSection(combined_high),
    highlights_low: cleanSection(highlights_low),
    morning: cleanSection(morning),
    afternoon: cleanSection(afternoon),
    night: cleanSection(night),
  }
}

/**
 * Check if a time string represents afternoon (12pm-5pm)
 */
function isAfternoonTime(line: string): boolean {
  const match = line.match(/^(\d{1,2})(pm|am|:)/i)
  if (!match) return false
  const hour = parseInt(match[1], 10)
  const isPm = match[2].toLowerCase() === 'pm'
  if (isPm && hour >= 12 && hour < 6) return true // 12pm-5pm
  if (isPm && hour < 6) return true // 1pm-5pm
  return false
}

/**
 * Check if a time string represents evening (6pm+)
 */
function isEveningTime(line: string): boolean {
  const match = line.match(/^(\d{1,2})(pm|am|:)/i)
  if (!match) return false
  const hour = parseInt(match[1], 10)
  const isPm = match[2].toLowerCase() === 'pm'
  if (isPm && hour >= 6 && hour < 12) return true // 6pm-11pm
  if (isPm && hour === 12) return false // 12pm is afternoon
  return false
}

/**
 * Clean up a section's content
 */
function cleanSection(lines: string[]): string | null {
  const text = lines.join('\n').trim()
  // Return null if only whitespace or bullet placeholders
  if (!text || text === '-' || text === '*' || text === '- ' || text === '* ') {
    return null
  }
  return text
}

/**
 * Import entries into the database
 */
async function importEntries(entries: ParsedEntry[]): Promise<void> {
  let imported = 0
  let skipped = 0
  let errors = 0

  // First, fetch or create all tags
  const tagMap = new Map<string, string>() // tag name -> tag id
  const allTags = new Set<string>()
  for (const entry of entries) {
    for (const tag of entry.tags) {
      allTags.add(tag.toLowerCase())
    }
  }

  // Get existing tags
  const { data: existingTags, error: tagFetchError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', USER_ID)

  if (tagFetchError) {
    console.error('Error fetching tags:', tagFetchError)
    process.exit(1)
  }

  for (const tag of existingTags || []) {
    tagMap.set(tag.name.toLowerCase(), tag.id)
  }

  // Create missing tags
  const missingTags = [...allTags].filter(t => !tagMap.has(t))
  if (missingTags.length > 0) {
    const { data: newTags, error: tagCreateError } = await supabase
      .from('tags')
      .insert(missingTags.map(name => ({ user_id: USER_ID, name })))
      .select()

    if (tagCreateError) {
      console.error('Error creating tags:', tagCreateError)
    } else {
      for (const tag of newTags || []) {
        tagMap.set(tag.name.toLowerCase(), tag.id)
      }
    }
  }

  console.log(`Found ${tagMap.size} tags (${missingTags.length} newly created)`)

  // Import entries
  for (const entry of entries) {
    try {
      // Upsert entry
      const { data: entryResult, error: entryError } = await supabase
        .from('entries')
        .upsert({
          user_id: USER_ID,
          date: entry.date,
          p_score: entry.p_score,
          l_score: entry.l_score,
          weight: entry.weight,
          highlights_high: entry.highlights_high,
          highlights_low: entry.highlights_low,
          morning: entry.morning,
          afternoon: entry.afternoon,
          night: entry.night,
          complete: true, // Mark imported entries as complete
        }, { onConflict: 'user_id,date' })
        .select()
        .single()

      if (entryError) {
        console.error(`Error importing ${entry.date}:`, entryError)
        errors++
        continue
      }

      // Sync tags
      if (entry.tags.length > 0) {
        // Delete existing entry_tags
        await supabase
          .from('entry_tags')
          .delete()
          .eq('entry_id', entryResult.id)

        // Insert new entry_tags
        const tagIds = entry.tags
          .map(t => tagMap.get(t.toLowerCase()))
          .filter((id): id is string => !!id)

        if (tagIds.length > 0) {
          const { error: linkError } = await supabase
            .from('entry_tags')
            .insert(tagIds.map(tag_id => ({
              entry_id: entryResult.id,
              tag_id,
            })))

          if (linkError) {
            console.warn(`Warning: failed to link tags for ${entry.date}:`, linkError)
          }
        }
      }

      imported++
    } catch (e) {
      console.error(`Error importing ${entry.date}:`, e)
      errors++
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Imported: ${imported}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

async function main() {
  console.log('Finding journal files...')
  const files = findJournalFiles()
  console.log(`Found ${files.length} potential journal files`)

  console.log('\nParsing files...')
  const entries: ParsedEntry[] = []
  let parseErrors = 0

  for (const file of files) {
    const entry = parseJournalFile(file)
    if (entry) {
      entries.push(entry)
    } else {
      parseErrors++
    }
  }

  console.log(`Parsed ${entries.length} entries (${parseErrors} parse errors)`)

  if (entries.length === 0) {
    console.log('No entries to import')
    return
  }

  console.log('\nImporting to database...')
  await importEntries(entries)
}

main().catch(console.error)
