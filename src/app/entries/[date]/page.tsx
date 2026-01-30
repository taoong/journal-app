import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import EntryForm from '@/components/EntryForm'

export default async function EntryPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: entry } = await supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tag_id,
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const selectedTagIds = entry?.entry_tags
    ?.map((et: { tags?: { id: string } | null }) => et.tags?.id)
    .filter((id: unknown): id is string => typeof id === 'string') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {entry ? 'Edit Entry' : 'New Entry'}
        </h1>
        <EntryForm 
          initialDate={date}
          entry={entry || undefined}
          selectedTagIds={selectedTagIds}
          availableTags={tags || []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
