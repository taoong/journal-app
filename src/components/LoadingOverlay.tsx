'use client'

import { useLoading } from '@/contexts/LoadingContext'

export default function LoadingOverlay() {
  const { isLoading } = useLoading()

  if (!isLoading) return null

  return (
    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-xl">
      <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
    </div>
  )
}
