import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
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
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {entry ? 'Edit Entry' : 'New Entry'}
          </h1>
          <p className="text-zinc-500 mt-1">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        
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
