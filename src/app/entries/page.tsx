import { createServerSupabase } from '@/lib/supabase-server'
import { format } from 'date-fns'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function EntriesPage() {
  const supabase = await createServerSupabase()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tag_id,
        tags (
          name
        )
      )
    `)
    .eq('user_id', user?.id)
    .order('date', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <div className="flex gap-4">
            <Link
              href="/entries/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Entry
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
            Error loading entries: {error.message}
          </div>
        )}

        <div className="space-y-4">
          {entries?.map((entry) => {
            const tags = entry.entry_tags
              ?.map((et: { tags?: { name: string } | null }) => et.tags?.name)
              .filter((name: unknown): name is string => typeof name === 'string') || []
            
            return (
              <Link
                key={entry.id}
                href={`/entries/${entry.date}`}
                className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {format(new Date(entry.date), 'MMMM d, yyyy')}
                  </h2>
                  <div className="flex gap-3 text-sm">
                    {entry.p_score && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        P: {entry.p_score}/10
                      </span>
                    )}
                    {entry.l_score && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        L: {entry.l_score}/10
                      </span>
                    )}
                  </div>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {entry.highlights_high && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    <span className="font-medium">High:</span> {entry.highlights_high}
                  </p>
                )}
              </Link>
            )
          })}

          {entries?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No entries yet. Create your first one!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
