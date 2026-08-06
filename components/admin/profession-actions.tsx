'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  id: number
  isCustom: boolean
  isArchived: boolean
}

export function ProfessionActions({ id, isCustom, isArchived }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function act(action: string) {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch(`/api/admin/professions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const r = await res.json()
      if (r.error) setMsg(r.error)
      else router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act('duplicate')}>Duplicate</Button>
      <Button size="sm" variant={isArchived ? 'default' : 'outline'} disabled={busy} onClick={() => act(isArchived ? 'unarchive' : 'archive')}>
        {isArchived ? 'Activate' : 'Archive'}
      </Button>
      {isCustom && (
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (confirm('Delete this profession? Businesses using it keep their config copy.')) act('delete')
          }}
        >
          Delete
        </Button>
      )}
      {msg && <span className="text-xs text-red-500">{msg}</span>}
    </div>
  )
}
