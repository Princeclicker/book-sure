'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NotificationComposer() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState('info')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, severity, link: link || null }),
      })
      const r = await res.json()
      if (r.error) setError(r.error)
      else {
        setTitle('')
        setMessage('')
        setLink('')
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Title *</label>
        <input
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Message</label>
        <textarea
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Severity</label>
          <select
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Link (optional)</label>
          <input
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/admin/businesses"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish notification'}</Button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  )
}
