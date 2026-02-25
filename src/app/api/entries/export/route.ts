import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

interface EntryWithTags {
  date: string
  p_score?: number | null
  l_score?: number | null
  weight?: number | null
  highlights_high?: string | null
  highlights_low?: string | null
  morning?: string | null
  afternoon?: string | null
  night?: string | null
  more?: string | null
  created_at: string
  entry_tags?: Array<{ tags?: { name: string } | null }>
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all entries with tags
  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format as CSV
  const headers = [
    'Date',
    'P-Score',
    'L-Score',
    'Weight',
    'Tags',
    'Highlights High',
    'Highlights Low',
    'Morning',
    'Afternoon',
    'Night',
    'More',
    'Created At'
  ]

  const rows = entries.map((entry: EntryWithTags) => {
    const tags = entry.entry_tags
      ?.map((et: { tags?: { name: string } | null }) => et.tags?.name)
      .filter((name: unknown): name is string => typeof name === 'string')
      .join('; ') || ''

    return [
      entry.date,
      entry.p_score || '',
      entry.l_score || '',
      entry.weight || '',
      `"${tags.replace(/"/g, '""')}"`,
      `"${(entry.highlights_high || '').replace(/"/g, '""')}"`,
      `"${(entry.highlights_low || '').replace(/"/g, '""')}"`,
      `"${(entry.morning || '').replace(/"/g, '""')}"`,
      `"${(entry.afternoon || '').replace(/"/g, '""')}"`,
      `"${(entry.night || '').replace(/"/g, '""')}"`,
      `"${(entry.more || '').replace(/"/g, '""')}"`,
      entry.created_at
    ]
  })

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="journal-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
