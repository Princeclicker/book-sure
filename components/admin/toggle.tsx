'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label?: string
}) {
  const [optimistic, setOptimistic] = useState(checked)
  const value = checked
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        setOptimistic(!optimistic)
        onChange(!value)
      }}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        value ? 'bg-primary' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
