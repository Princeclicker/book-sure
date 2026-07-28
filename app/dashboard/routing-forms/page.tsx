'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Share2, Loader2, Copy, CheckCircle2, GripVertical } from 'lucide-react'
import { getRoutingForms, createRoutingForm, deleteRoutingForm } from '@/app/actions/routing-forms'
import { getTeams } from '@/app/actions/teams'

interface FormField { label: string; type: string; required: boolean }
interface RoutingForm {
  id: number; title: string; fields: FormField[]; teamId: number | null
  redirectUrl: string | null; isActive: boolean | null; shareToken: string | null
}
interface Team { id: number; teamName: string }

export default function RoutingFormsPage() {
  const [forms, setForms] = useState<RoutingForm[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', teamId: 0, redirectUrl: '',
    fields: [{ label: 'Full Name', type: 'text', required: true }],
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [f, t] = await Promise.all([getRoutingForms(), getTeams()])
    setForms(f as any)
    setTeams(t as any)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createRoutingForm({
        title: form.title,
        fields: form.fields,
        teamId: form.teamId || undefined,
        redirectUrl: form.redirectUrl || undefined,
      })
      setShowCreate(false)
      setForm({ title: '', teamId: 0, redirectUrl: '', fields: [{ label: 'Full Name', type: 'text', required: true }] })
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create form') }
  }

  function addField() {
    setForm({ ...form, fields: [...form.fields, { label: '', type: 'text', required: false }] })
  }

  function removeField(i: number) {
    setForm({ ...form, fields: form.fields.filter((_, idx) => idx !== i) })
  }

  function updateField(i: number, data: Partial<FormField>) {
    const newFields = [...form.fields]
    newFields[i] = { ...newFields[i], ...data }
    setForm({ ...form, fields: newFields })
  }

  function copyLink(token: string, id: number) {
    const url = `${window.location.origin}/routing/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Routing Forms
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Capture leads from your website and route them to the right team.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="w-4 h-4" /> Create Form
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200">{error}</div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">New Routing Form</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Form Title</label>
              <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Contact Us" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Route to Team</label>
                <select value={form.teamId} onChange={e => setForm({ ...form, teamId: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                  <option value={0}>No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Redirect URL</label>
                <input type="url" value={form.redirectUrl} onChange={e => setForm({ ...form, redirectUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://..." />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Form Fields</label>
                <button type="button" onClick={addField} className="text-sm text-primary hover:underline cursor-pointer">+ Add field</button>
              </div>
              <div className="space-y-2">
                {form.fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="text" placeholder="Field label" value={field.label} required
                      onChange={e => updateField(i, { label: e.target.value })}
                      className="flex-1 px-2 py-1.5 rounded border border-input bg-background text-foreground text-sm" />
                    <select value={field.type} onChange={e => updateField(i, { type: e.target.value })}
                      className="px-2 py-1.5 rounded border border-input bg-background text-foreground text-sm">
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeField(i)} className="p-1.5 text-muted-foreground hover:text-red-500 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Form</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        {forms.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Forms Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create routing forms to capture leads and assign them to your team.</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Form</button>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map(f => (
              <div key={f.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{f.fields?.length || 0} fields{f.teamId ? ' | Routed to team' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.shareToken && (
                      <button onClick={() => copyLink(f.shareToken!, f.id)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer" title="Copy form link">
                        {copiedId === f.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={async () => { await deleteRoutingForm(f.id); await loadData() }} className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
