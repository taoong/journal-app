import { memo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'

interface EntryCardProps {
  entry: {
    id: string
    date: string
    p_score?: number | null
    l_score?: number | null
    highlights_high?: string | null
  }
  tags: string[]
}

const EntryCard = memo(function EntryCard({ entry, tags }: EntryCardProps) {
  return (
    <Link
      href={`/entries/${entry.date}`}
      className="block bg-white rounded-xl border border-zinc-200 px-4 py-3 hover:border-zinc-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-zinc-900 group-hover:text-zinc-700 transition-colors">
            {format(new Date(entry.date), 'EEE, MMM d, yyyy')}
          </h3>
          {entry.p_score && (
            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
              P: {entry.p_score}
            </span>
          )}
          {entry.l_score && (
            <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full">
              L: {entry.l_score}
            </span>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  )
})

export default EntryCard
