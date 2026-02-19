import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { calendarParamsSchema } from '@/lib/validation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  // Validate date parameter
  const parsed = calendarParamsSchema.safeParse({ date: dateParam })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }
  const { date } = parsed.data

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to get from database first
  const { data: cachedEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('start_time')

  if (cachedEvents && cachedEvents.length > 0) {
    return NextResponse.json(
      { events: cachedEvents, source: 'cache' },
      { headers: { 'Cache-Control': 'private, max-age=300' } } // Cache for 5 minutes
    )
  }

  // Get the access token from Supabase
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ 
      error: 'No calendar access. Please re-login with Calendar permissions.',
      needsReauth: true 
    }, { status: 401 })
  }

  // Fetch from Google Calendar API
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startOfDay.toISOString()}&` +
      `timeMax=${endOfDay.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Google Calendar API error:', response.status, errorData)

      if (response.status === 401) {
        return NextResponse.json({
          error: 'Calendar access expired. Please sign out and re-login to reconnect.',
          needsReauth: true
        }, { status: 401 })
      }

      throw new Error(errorData.error?.message || `Google Calendar error: ${response.status}`)
    }

    const data = await response.json()
    const events: Array<{ summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> = data.items || []

    // Save to database
    if (events.length > 0) {
      const eventData = events.map((event) => ({
        user_id: user.id,
        date: date,
        summary: event.summary || 'Busy',
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
      }))

      await supabase.from('calendar_events').upsert(eventData, { onConflict: 'user_id,summary,start_time' })
    }

    return NextResponse.json({ events, source: 'api' })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
