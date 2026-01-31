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

export default function EntryCard({ entry, tags }: EntryCardProps) {
  return (
    <Link
      href={`/entries/${entry.date}`}
      className="block bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-zinc-900 group-hover:text-zinc-700 transition-colors">
            {format(new Date(entry.date), 'EEEE, MMMM d')}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            {entry.p_score && (
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                P: {entry.p_score}/10
              </span>
            )}
            {entry.l_score && (
              <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full">
                L: {entry.l_score}/10
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
      </div>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
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

      {entry.highlights_high && (
        <p className="text-sm text-zinc-600 line-clamp-2">
          <span className="font-medium text-zinc-900">High:</span> {entry.highlights_high}
        </p>
      )}
    </Link>
  )
}
