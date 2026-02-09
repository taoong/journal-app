'use client'

import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { Textarea } from './textarea'

interface DebouncedTextareaProps {
  value: string
  onChange: (value: string) => void
  delay?: number
  id?: string
  placeholder?: string
  rows?: number
}

export const DebouncedTextarea = memo(function DebouncedTextarea({
  value: externalValue,
  onChange,
  delay = 300,
  ...props
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(externalValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Sync external value when not typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(externalValue)
    }
  }, [externalValue])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    isTypingRef.current = true

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
      isTypingRef.current = false
    }, delay)
  }, [onChange, delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Textarea
      {...props}
      value={localValue}
      onChange={handleChange}
    />
  )
})
