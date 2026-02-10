import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EntryForm from '@/components/EntryForm'
import { ArrowLeft } from 'lucide-react'

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
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-2xl mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/entries"
              className="p-2 -ml-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Back to entries"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">New Entry</h1>
              <p className="text-sm text-zinc-500">{format(new Date(today), 'EEEE, MMM d')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-6 px-4">
        <EntryForm
          initialDate={today}
          availableTags={tags || []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
