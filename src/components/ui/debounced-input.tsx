'use client'

import { memo } from 'react'
import { Input } from './input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

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
  const { localValue, handleChange } = useDebouncedValue(
    externalValue,
    onChange,
    { delay }
  )

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
})
