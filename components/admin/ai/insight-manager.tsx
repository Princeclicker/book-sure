'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge, statusTone } from '@/components/admin/badge'
import { RefreshCw } from 'lucide-react'

export interface AdminInsight {
  id: number
  userId: string
  insightType: string
  title: string
  description: string
  priority: string
  isRead: boolean
  isDismissed: boolean
  createdAt: string
}

const PRIORITY_TONE: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
  urgent: 'red',
  high: 'amber',
  medium: 'blue',
  low: 'gray',
}

export function InsightManager({
  insights,
  ownerNameByUserId,
}: {
  insights: AdminInsight[]
  ownerNameByUserId: Record<string, string>
}) {
  const router = useRouter()
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const types = useMemo(
    () => [...new Set(insights.map((i) => i.insightType))].sort(),
    [insights]
  )
  const priorities = useMemo(
    () => [...new Set(insights.map((i) => i.priority ?? 'medium'))].sort(),
    [insights]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return insights.filter((i) => {
      if (typeFilter && i.insightType !== typeFilter) return false
      if (priorityFilter && (i.priority ?? 'medium') !== priorityFilter) return false
      if (needle && !(i.title.toLowerCase().includes(needle) || i.description.toLowerCase().includes(needle))) return false
      return true
    })
  }, [insights, typeFilter, priorityFilter, q])

  async function patch(id: number, body: Record<string, unknown>) {
    await fetch(`/api/admin/ai/insights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    router.refresh()
  }

  async function remove(id: number) {
    await fetch(`/api/admin/ai/insights/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function regenerate() {
    if (!window.confirm('Regenerate insights for all businesses using the rules engine? This replaces existing insights.')) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/ai/insights', { method: 'POST' })
      const r = await res.json()
      if (r.error) setMessage(`Error: ${r.error}`)
      else {
        setMessage(`Generated ${r.generated} insights across ${r.businesses} businesses.`)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <input
          className="h-8 w-56 rounded-md border border-border bg-background px-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search insights…"
        />
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Button onClick={regenerate} disabled={busy}>
          <RefreshCw className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {busy ? 'Regenerating…' : 'Regenerate (rules engine)'}
        </Button>
      </div>
      {message && <p className="border-b border-border px-4 py-2 text-sm text-emerald-600">{message}</p>}

      <div className="divide-y divide-border">
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No insights match your filters.</p>
        )}
        {filtered.map((i) => (
          <div key={i.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-medium ${i.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {i.title}
                  </span>
                  <Badge tone={statusTone(i.insightType)}>{i.insightType}</Badge>
                  <Badge tone={PRIORITY_TONE[i.priority ?? 'medium'] ?? 'gray'}>{i.priority ?? 'medium'}</Badge>
                  {i.isDismissed && <Badge tone="gray">dismissed</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{i.description}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {ownerNameByUserId[i.userId] ?? 'Unknown business'} ·{' '}
                  {new Date(i.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => patch(i.id, { isRead: !i.isRead })}>
                  {i.isRead ? 'Mark unread' : 'Mark read'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => patch(i.id, { isDismissed: !i.isDismissed })}>
                  {i.isDismissed ? 'Restore' : 'Dismiss'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(i.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
