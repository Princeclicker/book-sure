'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge, statusTone } from '@/components/admin/badge'
import { PROVIDER_TYPES, PROVIDER_LABELS, DEFAULT_MODELS } from '@/lib/ai/admin'

export interface AdminProvider {
  id: number
  userId: string
  providerType: string
  apiKey: string
  hasKey: boolean
  isActive: boolean
  config: {
    name?: string
    model?: string
    temperature?: number
    maxTokens?: number
  }
  createdAt: string
}

export function ProviderManager({
  providers,
  businesses,
  ownerNameByUserId,
}: {
  providers: AdminProvider[]
  businesses: { id: number; businessName: string }[]
  ownerNameByUserId: Record<string, string>
}) {
  const router = useRouter()

  const [form, setForm] = useState({
    providerType: 'openai' as string,
    name: '',
    model: '',
    apiKey: '',
    businessId: 0,
    isActive: true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editModel, setEditModel] = useState('')
  const [editApiKey, setEditApiKey] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: form.providerType,
          name: form.name,
          model: form.model || DEFAULT_MODELS[form.providerType as keyof typeof DEFAULT_MODELS],
          apiKey: form.apiKey,
          businessId: Number(form.businessId),
          isActive: form.isActive,
        }),
      })
      const r = await res.json()
      if (r.error) setError(r.error)
      else {
        setForm({ ...form, name: '', model: '', apiKey: '', businessId: 0, isActive: true })
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: form.providerType,
          apiKey: form.apiKey,
          model: form.model || DEFAULT_MODELS[form.providerType as keyof typeof DEFAULT_MODELS],
        }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  async function toggleActive(p: AdminProvider) {
    await fetch(`/api/admin/ai/providers/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    router.refresh()
  }

  function startEdit(p: AdminProvider) {
    setEditingId(p.id)
    setEditModel(p.config.model ?? '')
    setEditApiKey('')
    setEditError('')
  }

  async function saveEdit(p: AdminProvider) {
    setEditBusy(true)
    setEditError('')
    try {
      const payload: Record<string, unknown> = {}
      if (editModel) payload.config = { model: editModel }
      if (editApiKey) payload.apiKey = editApiKey
      const res = await fetch(`/api/admin/ai/providers/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const r = await res.json()
      if (r.error) setEditError(r.error)
      else {
        setEditingId(null)
        router.refresh()
      }
    } finally {
      setEditBusy(false)
    }
  }

  async function remove(p: AdminProvider) {
    if (!window.confirm(`Delete ${PROVIDER_LABELS[p.providerType as keyof typeof PROVIDER_LABELS] ?? p.providerType} provider for ${ownerNameByUserId[p.userId] ?? 'this business'}?`)) return
    await fetch(`/api/admin/ai/providers/${p.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <form onSubmit={create} className="space-y-3 border-b border-border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Provider *</label>
            <select
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.providerType}
              onChange={(e) => setForm({ ...form, providerType: e.target.value, model: '' })}
            >
              {PROVIDER_TYPES.map((t) => (
                <option key={t} value={t}>{PROVIDER_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Label</label>
            <input
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Production OpenAI"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Model</label>
            <input
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder={DEFAULT_MODELS[form.providerType as keyof typeof DEFAULT_MODELS]}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">API key *</label>
            <input
              type="password"
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Owner business</label>
            <select
              className="mt-1 h-8 w-64 max-w-full rounded-md border border-border bg-background px-2 text-sm"
              value={form.businessId}
              onChange={(e) => setForm({ ...form, businessId: Number(e.target.value) })}
            >
              <option value={0}>Platform default (admin)</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.businessName}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4"
            />
            Active
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || !form.apiKey}>
            {busy ? 'Adding…' : 'Add provider'}
          </Button>
          <Button type="button" variant="outline" onClick={test} disabled={testing || !form.apiKey}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
          {testResult && (
            <span className={testResult.ok ? 'text-sm text-emerald-600' : 'text-sm text-red-500'}>
              {testResult.message}
            </span>
          )}
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </form>

      <div className="divide-y divide-border">
        {providers.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No AI providers configured yet.</p>
        )}
        {providers.map((p) => {
          const label = PROVIDER_LABELS[p.providerType as keyof typeof PROVIDER_LABELS] ?? p.providerType
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{p.config.name || label}</span>
                  <Badge tone="blue">{label}</Badge>
                  <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'active' : 'inactive'}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Owner: {ownerNameByUserId[p.userId] ?? 'Platform'} · Model: {p.config.model || 'default'} ·
                  Key: {p.hasKey ? p.apiKey : 'no key'} {p.config.maxTokens ? `· Max tokens: ${p.config.maxTokens}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingId === p.id ? (
                  <>
                    <input
                      className="h-8 w-40 rounded-md border border-border bg-background px-2 text-sm"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      placeholder="Model"
                    />
                    <input
                      className="h-8 w-40 rounded-md border border-border bg-background px-2 text-sm"
                      type="password"
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      placeholder="New API key (leave blank)"
                    />
                    <Button variant="outline" size="sm" onClick={() => saveEdit(p)} disabled={editBusy}>
                      {editBusy ? '…' : 'Save'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    {editError && <span className="text-xs text-red-500">{editError}</span>}
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(p)}>
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => remove(p)}>Delete</Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
