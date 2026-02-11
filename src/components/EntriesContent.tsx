'use client'

import { Suspense, ReactNode } from 'react'
import { LoadingProvider } from '@/contexts/LoadingContext'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function EntriesContent({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LoadingProvider>
        <div className="relative">
          <LoadingOverlay />
          {children}
        </div>
      </LoadingProvider>
    </Suspense>
  )
}
