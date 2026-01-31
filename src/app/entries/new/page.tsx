import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import EntryForm from '@/components/EntryForm'

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: queryDate } = await searchParams
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const today = queryDate || format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">New Entry</h1>
          <p className="text-zinc-500 mt-1">{format(new Date(today), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        
        <EntryForm 
          initialDate={today}
          availableTags={tags || []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
