'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDebouncedValueOptions {
  delay?: number
}

interface UseDebouncedValueReturn<T> {
  localValue: T
  setLocalValue: (value: T) => void
  handleChange: (newValue: T) => void
}

/**
 * Hook for managing debounced input state.
 * Returns local state that syncs with external value when not typing,
 * and a handler that debounces updates to the external onChange.
 */
export function useDebouncedValue<T>(
  externalValue: T,
  onChange: (value: T) => void,
  options: UseDebouncedValueOptions = {}
): UseDebouncedValueReturn<T> {
  const { delay = 300 } = options
  const [localValue, setLocalValue] = useState(externalValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Sync external value when not typing
  useEffect(() => {
    if (!isTypingRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Necessary for debounced input sync
      setLocalValue(externalValue)
    }
  }, [externalValue])

  const handleChange = useCallback(
    (newValue: T) => {
      setLocalValue(newValue)
      isTypingRef.current = true

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        onChangeRef.current(newValue)
        isTypingRef.current = false
      }, delay)
    },
    [delay]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { localValue, setLocalValue, handleChange }
}
