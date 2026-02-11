'use client'

import { createContext, useContext, useCallback, useSyncExternalStore, useEffect, ReactNode, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | null>(null)

// External store for loading state with target URL
let targetUrl: string | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return targetUrl
}

function setTargetUrl(url: string | null) {
  targetUrl = url
  listeners.forEach(listener => listener())
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentUrl = `${pathname}?${searchParams.toString()}`

  // Clear any stale target URL when the provider mounts
  // This handles the case where user navigates away and back
  useEffect(() => {
    setTargetUrl(null)
  }, [])

  // Subscribe to external store
  const pendingUrl = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Loading is true only if we have a target URL that doesn't match current URL
  const isLoading = pendingUrl !== null && pendingUrl !== currentUrl

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      // This will be set with actual URL in NavLink
      // For now just set a placeholder that won't match
      setTargetUrl('__pending__')
    } else {
      setTargetUrl(null)
    }
  }, [])

  const contextValue = useMemo(() => ({ isLoading, setLoading }), [isLoading, setLoading])

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// Export for NavLink to set the actual target URL
export function setNavigationTarget(url: string) {
  setTargetUrl(url)
}
