import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { searchParamsSchema, escapeSearchQuery } from '@/lib/validation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Validate and parse search params
  const parsed = searchParamsSchema.safeParse({
    q: searchParams.get('q') || undefined,
    tag: searchParams.get('tag') || undefined,
    minP: searchParams.get('minP') || undefined,
    maxP: searchParams.get('maxP') || undefined,
    minL: searchParams.get('minL') || undefined,
    maxL: searchParams.get('maxL') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  const { q: query, tag, minP: minPScore, maxP: maxPScore, minL: minLScore, maxL: maxLScore, from: fromDate, to: toDate, limit, offset } = parsed.data

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let queryBuilder = supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tags (
          id,
          name
        )
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)

  // Text search across content fields
  if (query) {
    const escapedQuery = escapeSearchQuery(query)
    const searchCondition = `highlights_high.ilike.%${escapedQuery}%,highlights_low.ilike.%${escapedQuery}%,morning.ilike.%${escapedQuery}%,afternoon.ilike.%${escapedQuery}%,night.ilike.%${escapedQuery}%`
    queryBuilder = queryBuilder.or(searchCondition)
  }

  // Tag filter
  if (tag) {
    queryBuilder = queryBuilder.eq('entry_tags.tags.name', tag)
  }

  // Score range filters (values already coerced to numbers by Zod)
  if (minPScore) queryBuilder = queryBuilder.gte('p_score', minPScore)
  if (maxPScore) queryBuilder = queryBuilder.lte('p_score', maxPScore)
  if (minLScore) queryBuilder = queryBuilder.gte('l_score', minLScore)
  if (maxLScore) queryBuilder = queryBuilder.lte('l_score', maxLScore)

  // Date range filters
  if (fromDate) queryBuilder = queryBuilder.gte('date', fromDate)
  if (toDate) queryBuilder = queryBuilder.lte('date', toDate)

  // Order and paginate
  const { data: entries, error, count } = await queryBuilder
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries, count, limit, offset })
}
