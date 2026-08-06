'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ProfessionCreator() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/professions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, description }),
      })
      const r = await res.json()
      if (r.error) setError(r.error)
      else {
        setSlug('')
        setName('')
        setDescription('')
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Slug *</label>
          <input
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. physiotherapist"
            required
            pattern="[a-z0-9-]+"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Display name *</label>
          <input
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Physiotherapist"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <input
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create profession'}</Button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  )
}
