'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export interface SettingItem {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select'
  help?: string
  options?: { value: string; label: string }[]
}

export interface SettingsGroup {
  group: string
  items: SettingItem[]
}

export function SettingsForm({
  groups,
  values,
}: {
  groups: SettingsGroup[]
  values: Record<string, unknown>
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...values })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: draft }),
      })
      const r = await res.json()
      if (r.error) setError(r.error)
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.group}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{group.group}</h3>
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.help && <p className="mt-0.5 text-xs text-muted-foreground">{item.help}</p>}
                </div>
                <div className="w-72 max-w-full">
                  {item.type === 'boolean' ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(draft[item.key])}
                        onClick={() => set(item.key, !draft[item.key])}
                        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                        style={{ backgroundColor: draft[item.key] ? 'var(--primary)' : 'var(--muted)' }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          style={{ transform: draft[item.key] ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>
                  ) : item.type === 'select' ? (
                    <select
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                      value={String(draft[item.key] ?? '')}
                      onChange={(e) => set(item.key, e.target.value)}
                    >
                      {item.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={item.type === 'password' ? 'password' : 'text'}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                      value={String(draft[item.key] ?? '')}
                      onChange={(e) => set(item.key, item.type === 'number' ? Number(e.target.value) : e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
