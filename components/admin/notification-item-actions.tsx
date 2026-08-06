'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NotificationItemActions({ id, alreadyRead }: { id: number; alreadyRead: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function act(action: string) {
    setBusy(true)
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {!alreadyRead && (
        <Button size="xs" variant="outline" disabled={busy} onClick={() => act('read')}>Mark read</Button>
      )}
      <Button
        size="xs"
        variant="destructive"
        disabled={busy}
        onClick={() => act('delete')}
      >
        Delete
      </Button>
    </div>
  )
}
