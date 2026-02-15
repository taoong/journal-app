import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { timezone } = body

  if (!timezone) {
    return NextResponse.json({ error: 'Timezone is required' }, { status: 400 })
  }

  // Upsert preference
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      timezone,
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    console.error('Failed to save preference:', error)
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('timezone')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    timezone: preferences?.timezone || 'America/Los_Angeles',
  })
}
