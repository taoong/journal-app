import { createServerSupabase } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ImportEntryData } from '@/types/entry'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('pending_imports')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

const mergedDataSchema = z.object({
  p_score: z.number().nullable(),
  l_score: z.number().nullable(),
  weight: z.number().nullable(),
  calories: z.number().nullable(),
  sleep_hours: z.number().nullable(),
  highlights_high: z.string().nullable(),
  highlights_low: z.string().nullable(),
  morning: z.string().nullable(),
  afternoon: z.string().nullable(),
  night: z.string().nullable(),
  more: z.string().nullable(),
  tags: z.array(z.string()),
})

const resolveSchema = z.discriminatedUnion('resolution', [
  z.object({ id: z.string().uuid(), resolution: z.literal('obsidian') }),
  z.object({ id: z.string().uuid(), resolution: z.literal('web') }),
  z.object({ id: z.string().uuid(), resolution: z.literal('merged'), mergedData: mergedDataSchema }),
])

async function applyEntryData(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  date: string,
  data: ImportEntryData,
): Promise<string | null> {
  const { data: entryResult, error: upsertError } = await supabase
    .from('entries')
    .upsert({
      user_id: userId,
      date,
      p_score: data.p_score,
      l_score: data.l_score,
      weight: data.weight,
      calories: data.calories,
      sleep_hours: data.sleep_hours,
      highlights_high: data.highlights_high,
      highlights_low: data.highlights_low,
      morning: data.morning,
      afternoon: data.afternoon,
      night: data.night,
      more: data.more,
      complete: !!(data.highlights_high || data.highlights_low),
    }, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (upsertError) return upsertError.message

  const tagNames = (data.tags ?? []).map(t => t.toLowerCase())

  if (tagNames.length > 0) {
    const { data: existingTags } = await supabase
      .from('tags')
      .select('id, name')
      .eq('user_id', userId)
      .in('name', tagNames)

    const tagMap = new Map<string, string>()
    for (const tag of existingTags ?? []) {
      tagMap.set(tag.name.toLowerCase(), tag.id)
    }

    const missingTagNames = tagNames.filter(n => !tagMap.has(n))
    if (missingTagNames.length > 0) {
      const { data: newTags } = await supabase
        .from('tags')
        .insert(missingTagNames.map(name => ({ user_id: userId, name })))
        .select()
      for (const tag of newTags ?? []) {
        tagMap.set(tag.name.toLowerCase(), tag.id)
      }
    }

    await supabase.from('entry_tags').delete().eq('entry_id', entryResult.id)

    const tagIds = tagNames.map(n => tagMap.get(n)).filter((id): id is string => !!id)
    if (tagIds.length > 0) {
      await supabase.from('entry_tags').upsert(
        tagIds.map(tag_id => ({ entry_id: entryResult.id, tag_id })),
        { onConflict: 'entry_id,tag_id', ignoreDuplicates: true }
      )
    }
  } else {
    await supabase.from('entry_tags').delete().eq('entry_id', entryResult.id)
  }

  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = resolveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id, resolution } = parsed.data

  const { data: conflict, error: fetchError } = await supabase
    .from('pending_imports')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !conflict) {
    return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
  }

  if (resolution === 'obsidian') {
    const applyError = await applyEntryData(supabase, user.id, conflict.date, conflict.obsidian_data as ImportEntryData)
    if (applyError) return NextResponse.json({ error: applyError }, { status: 500 })
  } else if (resolution === 'merged') {
    const applyError = await applyEntryData(supabase, user.id, conflict.date, parsed.data.mergedData as ImportEntryData)
    if (applyError) return NextResponse.json({ error: applyError }, { status: 500 })
  }
  // resolution === 'web': no entry changes needed

  const statusMap = {
    obsidian: 'accepted_obsidian',
    web: 'accepted_web',
    merged: 'accepted_merged',
  } as const

  const { error: updateError } = await supabase
    .from('pending_imports')
    .update({ status: statusMap[resolution] })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  revalidatePath('/entries')
  revalidatePath('/settings')

  return NextResponse.json({ success: true })
}
