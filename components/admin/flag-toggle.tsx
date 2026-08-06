'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toggle } from '@/components/admin/toggle'

interface Props {
  flagKey: string
  label: string
  enabled: boolean
}

export function FlagToggle({ flagKey, label, enabled }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(enabled)
  const [busy, setBusy] = useState(false)

  async function onChange(next: boolean) {
    setValue(next)
    setBusy(true)
    try {
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: flagKey, enabled: next, label }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={busy ? 'pointer-events-none opacity-50' : ''}>
      <Toggle checked={value} onChange={onChange} label={label} />
    </div>
  )
}
