import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import TimelineWidget from '@/components/TimelineWidget'
import { parseEntry, formatTimeDisplay } from '@/lib/parse-bullets'
import { ArrowLeft, MapPin } from 'lucide-react'

export default async function TimelinePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch entry for this date
  const { data: entry } = await supabase
    .from('entries')
    .select('morning, afternoon, night')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  // Fetch location data for this date
  const { data: locationData } = await supabase
    .from('location_data')
    .select('places')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  // Parse entry bullets for timeline
  const parsedBullets = entry
    ? parseEntry(entry.morning, entry.afternoon, entry.night, date)
    : { all: [], morning: [], afternoon: [], night: [] }

  const places = locationData?.places || []
  const hasData = places.length > 0 || parsedBullets.all.length > 0

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-4xl mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/entries/${date}`}
              className="p-2 -ml-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Back to entry"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Timeline</h1>
              <p className="text-sm text-zinc-500">{format(new Date(date), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4">
        {hasData ? (
          <div className="space-y-8">
            {/* Full Timeline Widget */}
            <TimelineWidget
              date={date}
              places={places}
              bullets={parsedBullets.all}
              compact={false}
            />

            {/* Detailed Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Locations List */}
              {places.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <h2 className="font-medium text-zinc-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Places Visited
                    </h2>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {places.map((place: { name: string; address?: string; startTime: string; endTime: string; duration: number }, index: number) => (
                      <div key={`${place.name}-${index}`} className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{place.name}</div>
                        {place.address && (
                          <div className="text-sm text-zinc-500 mt-0.5 truncate">
                            {place.address}
                          </div>
                        )}
                        <div className="text-xs text-zinc-400 mt-1">
                          {new Date(place.startTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {new Date(place.endTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          <span className="mx-1">·</span>
                          {place.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Sections */}
              <div className="space-y-4">
                {parsedBullets.morning.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <h3 className="font-medium text-zinc-900">Morning</h3>
                      <p className="text-xs text-zinc-400">6am - 12pm</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {parsedBullets.morning.map((bullet) => (
                        <div key={bullet.index} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <div>
                            {bullet.timeStart && (
                              <span className="text-zinc-400 mr-1">
                                {formatTimeDisplay(bullet.timeStart)}
                              </span>
                            )}
                            <span className="text-zinc-700">{bullet.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedBullets.afternoon.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <h3 className="font-medium text-zinc-900">Afternoon</h3>
                      <p className="text-xs text-zinc-400">12pm - 6pm</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {parsedBullets.afternoon.map((bullet) => (
                        <div key={bullet.index} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                          <div>
                            {bullet.timeStart && (
                              <span className="text-zinc-400 mr-1">
                                {formatTimeDisplay(bullet.timeStart)}
                              </span>
                            )}
                            <span className="text-zinc-700">{bullet.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedBullets.night.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100">
                      <h3 className="font-medium text-zinc-900">Night</h3>
                      <p className="text-xs text-zinc-400">6pm - 11pm</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {parsedBullets.night.map((bullet) => (
                        <div key={bullet.index} className="flex items-start gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                          <div>
                            {bullet.timeStart && (
                              <span className="text-zinc-400 mr-1">
                                {formatTimeDisplay(bullet.timeStart)}
                              </span>
                            )}
                            <span className="text-zinc-700">{bullet.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
            <MapPin className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h2 className="font-medium text-zinc-900 mb-1">No timeline data</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Import location history from Google Takeout or add entries to see your timeline.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/settings"
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
              >
                Import Locations
              </Link>
              <Link
                href={`/entries/${date}`}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
              >
                Edit Entry
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
