'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  businessId: number
  status: string
  plan: string
  planStatus: string
}

const PLANS = ['free', 'pro', 'business', 'enterprise']
const PLAN_STATUS = ['active', 'trialing', 'past_due', 'canceled', 'paused']

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function BusinessActions({ businessId, status, plan, planStatus }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const suspended = status === 'suspended'

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true)
    setMsg('')
    try {
      const r = await post(`/api/admin/businesses/${businessId}`, { action, ...extra })
      if (r.url) {
        router.push(r.url)
        return
      }
      if (r.error) setMsg(r.error)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {suspended ? (
          <Button size="sm" disabled={busy} onClick={() => act('activate')}>Activate</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act('suspend')}>Suspend</Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act('impersonate')}>Impersonate</Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (confirm('Delete this business and ALL its data? This cannot be undone.')) {
              act('delete')
            }
          }}
        >
          Delete
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
          value={plan}
          onChange={(e) => act('set-plan', { plan: e.target.value, planStatus })}
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
          value={planStatus}
          onChange={(e) => act('set-plan', { plan, planStatus: e.target.value })}
        >
          {PLAN_STATUS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  )
}
