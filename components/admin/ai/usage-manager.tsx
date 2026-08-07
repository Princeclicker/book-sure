'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge, statusTone } from '@/components/admin/badge'

export interface AdminUsageRow {
  businessId: number
  businessName: string
  plan: string
  tokens: number
}

export function UsageManager({ rows }: { rows: AdminUsageRow[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [targets, setTargets] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => r.businessName.toLowerCase().includes(needle))
  }, [rows, q])

  async function apply(businessId: number, action: 'reset' | 'set') {
    setBusyId(businessId)
    try {
      const body: Record<string, unknown> = { action }
      if (action === 'set') body.tokens = Number(targets[businessId]) || 0
      const res = await fetch(`/api/admin/ai/usage/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="border-b border-border p-4">
        <input
          className="h-8 w-64 rounded-md border border-border bg-background px-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search businesses…"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="p-3 text-left font-medium text-muted-foreground">AI tokens</th>
              <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No businesses with AI usage tracked.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.businessId} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{r.businessName}</td>
                <td className="p-3"><Badge tone={statusTone(r.plan)}>{r.plan}</Badge></td>
                <td className="p-3 text-muted-foreground">{r.tokens.toLocaleString('en-US')}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min={0}
                      className="h-8 w-28 rounded-md border border-border bg-background px-2 text-sm"
                      placeholder="Set to…"
                      value={targets[r.businessId] ?? ''}
                      onChange={(e) => setTargets((t) => ({ ...t, [r.businessId]: e.target.value }))}
                    />
                    <Button variant="outline" size="sm" onClick={() => apply(r.businessId, 'set')} disabled={busyId === r.businessId}>
                      Set
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => apply(r.businessId, 'reset')} disabled={busyId === r.businessId}>
                      Reset
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
