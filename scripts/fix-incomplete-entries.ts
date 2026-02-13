import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixIncompleteEntries() {
  // Fetch all incomplete entries
  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, date, morning, afternoon, night, highlights_high, highlights_low')
    .eq('complete', false)

  if (error) {
    console.error('Error fetching entries:', error)
    return
  }

  console.log(`Found ${entries.length} incomplete entries`)

  // Filter to entries that have content
  const entriesToFix = entries.filter(entry =>
    entry.morning?.trim() ||
    entry.afternoon?.trim() ||
    entry.night?.trim() ||
    entry.highlights_high?.trim() ||
    entry.highlights_low?.trim()
  )

  console.log(`${entriesToFix.length} have content and should be marked complete`)

  if (entriesToFix.length === 0) {
    console.log('Nothing to fix!')
    return
  }

  // Update each entry
  const ids = entriesToFix.map(e => e.id)
  const { error: updateError, count } = await supabase
    .from('entries')
    .update({ complete: true })
    .in('id', ids)

  if (updateError) {
    console.error('Error updating entries:', updateError)
    return
  }

  console.log(`Successfully marked ${count} entries as complete`)

  // Log which dates were fixed
  entriesToFix.forEach(e => console.log(`  - ${e.date}`))
}

fixIncompleteEntries()
