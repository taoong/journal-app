'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/supabase'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = useSupabase()

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="text-sm font-medium">Sign out</span>
    </button>
  )
}
