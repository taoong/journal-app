'use client'

import { memo } from 'react'
import { Textarea } from './textarea'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

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
  const { localValue, handleChange } = useDebouncedValue(
    externalValue,
    onChange,
    { delay }
  )

  return (
    <Textarea
      {...props}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
})
