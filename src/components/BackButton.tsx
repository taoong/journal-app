'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
    >
      ← Back
    </button>
  )
}
