'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  email: string
  suspended: boolean
  emailVerified: boolean
  role: string
  isSelf: boolean
}

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function UserActions({ userId, email, suspended, emailVerified, role, isSelf }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await post(`/api/admin/users/${userId}`, { action, ...extra })
      if (r.url) {
        router.push(r.url)
        return
      }
      if (r.error) setMsg({ kind: 'error', text: r.error })
      else if (r.tempPassword) setMsg({ kind: 'ok', text: `Temporary password: ${r.tempPassword} — share securely.` })
      else router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {suspended ? (
          <Button size="sm" disabled={busy || isSelf} onClick={() => act('activate')}>Reactivate</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy || isSelf} onClick={() => act('suspend')}>Suspend</Button>
        )}
        {!emailVerified && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act('verify-email')}>Verify email</Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act('impersonate')}>Impersonate</Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (confirm(`Reset password for ${email}?`)) act('reset-password')
          }}
        >
          Reset password
        </Button>
      </div>
      <div className="flex items-center gap-1.5">
        <select
          className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
          value={role}
          disabled={isSelf}
          onChange={(e) => act('set-role', { role: e.target.value })}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </div>
      {msg && (
        <p className={`text-xs ${msg.kind === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{msg.text}</p>
      )}
    </div>
  )
}
