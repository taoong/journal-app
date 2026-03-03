import { createServerSupabase } from '@/lib/supabase-server'
import ConflictDiffViewer from '@/components/ConflictDiffViewer'
import BackButton from '@/components/BackButton'
import type { PendingImport } from '@/types/entry'
import { GitMerge } from 'lucide-react'

export default async function ImportConflictsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: conflicts } = await supabase
    .from('pending_imports')
    .select('*')
    .eq('user_id', user?.id)
    .eq('status', 'pending')
    .order('date', { ascending: true })

  const pendingConflicts = (conflicts ?? []) as PendingImport[]

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="sticky top-0 bg-zinc-50 pb-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <GitMerge className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900">Import Conflicts</h1>
              </div>
            </div>
            <BackButton />
          </div>
        </div>

        <ConflictDiffViewer initialConflicts={pendingConflicts} />
      </div>
    </div>
  )
}
