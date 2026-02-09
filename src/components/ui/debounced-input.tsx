'use client'

import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { Input } from './input'

interface DebouncedInputProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  id?: string
  type?: string
  step?: string
  placeholder?: string
}

export const DebouncedInput = memo(function DebouncedInput({
  value: externalValue,
  onChange,
  delay = 300,
  ...props
}: DebouncedInputProps) {
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    isTypingRef.current = true

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onChangeRef.current(newValue)
      isTypingRef.current = false
    }, delay)
  }, [delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Input
      {...props}
      value={localValue}
      onChange={handleChange}
    />
  )
})
