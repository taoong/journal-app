'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { format } from 'date-fns'

/**
 * Client component that ensures the URL includes the user's local date.
 * This fixes timezone issues where the server might be in a different timezone
 * than the user, causing future dates to appear as "incomplete".
 */
export default function DateSyncRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const clientToday = format(new Date(), 'yyyy-MM-dd')
    const urlToday = searchParams.get('clientToday')

    // Only redirect if the date is missing or different (new day)
    if (urlToday !== clientToday) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('clientToday', clientToday)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [pathname, searchParams, router])

  return null
}
