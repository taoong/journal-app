import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function SettingsPage() {
  await createServerSupabase()

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
          <Link
            href="/entries"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-medium text-zinc-900">Integrations</h2>
          </div>
          
          <div className="divide-y divide-zinc-100">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900">Google Calendar</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Sync calendar events for auto-stubbing
                </p>
              </div>
              <span className="text-sm px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                Connected
              </span>
            </div>

            <div className="px-5 py-4 flex items-center justify-between opacity-50">
              <div>
                <h3 className="font-medium text-zinc-900">Google Maps</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Track places you visit
                </p>
              </div>
              <span className="text-sm px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-full">
                Coming Soon
              </span>
            </div>

            <div className="px-5 py-4 flex items-center justify-between opacity-50">
              <div>
                <h3 className="font-medium text-zinc-900">Oura Ring</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Sync sleep and health metrics
                </p>
              </div>
              <span className="text-sm px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-full">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
