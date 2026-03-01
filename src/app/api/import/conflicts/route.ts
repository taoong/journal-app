import { createServerSupabase } from '@/lib/supabase-server'
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

const resolveSchema = z.object({
  id: z.string().uuid(),
  resolution: z.enum(['obsidian', 'web']),
})

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

  // Fetch the conflict row (RLS enforces ownership)
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
    const obsData = conflict.obsidian_data as ImportEntryData

    // Upsert entry with obsidian data
    const { data: entryResult, error: upsertError } = await supabase
      .from('entries')
      .upsert({
        user_id: user.id,
        date: conflict.date,
        p_score: obsData.p_score,
        l_score: obsData.l_score,
        weight: obsData.weight,
        calories: obsData.calories,
        sleep_hours: obsData.sleep_hours,
        highlights_high: obsData.highlights_high,
        highlights_low: obsData.highlights_low,
        morning: obsData.morning,
        afternoon: obsData.afternoon,
        night: obsData.night,
        more: obsData.more,
        complete: !!(obsData.highlights_high || obsData.highlights_low),
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Sync tags: fetch existing tags by name
    const tagNames = (obsData.tags ?? []).map(t => t.toLowerCase())

    if (tagNames.length > 0) {
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', user.id)
        .in('name', tagNames)

      const tagMap = new Map<string, string>()
      for (const tag of existingTags ?? []) {
        tagMap.set(tag.name.toLowerCase(), tag.id)
      }

      // Insert missing tags
      const missingTagNames = tagNames.filter(n => !tagMap.has(n))
      if (missingTagNames.length > 0) {
        const { data: newTags } = await supabase
          .from('tags')
          .insert(missingTagNames.map(name => ({ user_id: user.id, name })))
          .select()
        for (const tag of newTags ?? []) {
          tagMap.set(tag.name.toLowerCase(), tag.id)
        }
      }

      // Delete existing entry_tags and re-insert
      await supabase.from('entry_tags').delete().eq('entry_id', entryResult.id)

      const tagIds = tagNames.map(n => tagMap.get(n)).filter((id): id is string => !!id)
      if (tagIds.length > 0) {
        await supabase.from('entry_tags').upsert(
          tagIds.map(tag_id => ({ entry_id: entryResult.id, tag_id })),
          { onConflict: 'entry_id,tag_id', ignoreDuplicates: true }
        )
      }
    } else {
      // Clear all tags if obsidian has none
      const { data: entryData } = await supabase
        .from('entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', conflict.date)
        .single()
      if (entryData) {
        await supabase.from('entry_tags').delete().eq('entry_id', entryData.id)
      }
    }
  }
  // If resolution === 'web', no entry changes needed

  // Update pending_imports status
  const newStatus = resolution === 'obsidian' ? 'accepted_obsidian' : 'accepted_web'
  const { error: updateError } = await supabase
    .from('pending_imports')
    .update({ status: newStatus })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
