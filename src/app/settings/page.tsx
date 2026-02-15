import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import LocationImport from '@/components/LocationImport'
import TimezoneSelector from '@/components/TimezoneSelector'
import { Check, Plus, Calendar, MapPin, Activity, Globe } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Check integration status and user preferences
  const [{ data: ouraIntegration }, { data: preferences }] = await Promise.all([
    supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user?.id)
      .eq('provider', 'oura')
      .single(),
    supabase
      .from('user_preferences')
      .select('timezone')
      .eq('user_id', user?.id)
      .single(),
  ])

  const ouraConnected = !!ouraIntegration?.access_token
  const userTimezone = preferences?.timezone || 'America/Los_Angeles'

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

        {/* Preferences */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-medium text-zinc-900">Preferences</h2>
          </div>

          <div className="divide-y divide-zinc-100">
            {/* Timezone */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900">Timezone</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Used for incomplete days calculation
                  </p>
                </div>
              </div>
              <TimezoneSelector initialTimezone={userTimezone} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-medium text-zinc-900">Integrations</h2>
          </div>

          <div className="divide-y divide-zinc-100">
            {/* Google Calendar */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900">Google Calendar</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Sync calendar events for auto-stubbing
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-sm px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Connected
              </span>
            </div>

            {/* Google Maps / Location History */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900">Location History</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Import places from Google Takeout
                  </p>
                </div>
              </div>
              <LocationImport />
            </div>

            {/* Oura Ring */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-900">Oura Ring</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      Sync sleep, HRV, and health metrics
                    </p>
                  </div>
                </div>
                {ouraConnected ? (
                  <span className="flex items-center gap-1.5 text-sm px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <a
                    href={`/api/oauth/oura?user_id=${user?.id}`}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Connect
                  </a>
                )}
              </div>
              
              {ouraConnected && (
                <div className="mt-3 ml-12">
                  <a
                    href="/api/oura"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sync Oura data →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-medium text-zinc-900">Data</h2>
          </div>
          
          <div className="divide-y divide-zinc-100">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900">Export Journal</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Download all your entries as CSV
                </p>
              </div>
              <a
                href="/api/entries/export"
                className="text-sm px-3 py-1.5 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Export
              </a>
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
