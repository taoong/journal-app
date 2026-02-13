import Link from 'next/link'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'

interface MissingDayCardProps {
  date: string
}

export default function MissingDayCard({ date }: MissingDayCardProps) {
  return (
    <Link
      href={`/entries/new?date=${date}`}
      className="block bg-red-50 rounded-xl border border-red-200 px-4 py-3 hover:border-red-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-red-900 group-hover:text-red-700 transition-colors">
            {format(new Date(date), 'EEE, MMM d, yyyy')}
          </h3>
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
            Missing
          </span>
        </div>
        <div className="flex items-center gap-1 text-red-400 group-hover:text-red-500 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Create</span>
        </div>
      </div>
    </Link>
  )
}
