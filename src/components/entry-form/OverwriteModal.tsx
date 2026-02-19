'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface OverwriteModalProps {
  existingEntryDate: string | null
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function OverwriteModal({
  existingEntryDate,
  loading,
  onCancel,
  onConfirm,
}: OverwriteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900">
              Overwrite existing entry?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              You already have an entry for <strong>{existingEntryDate}</strong>.
              This action will permanently replace all content in that entry with
              what you&apos;ve written here.
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <Link
            href={`/entries/${existingEntryDate}`}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
          >
            Edit existing entry
          </Link>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Overwriting...' : 'Overwrite'}
          </button>
        </div>
      </div>
    </div>
  )
}
