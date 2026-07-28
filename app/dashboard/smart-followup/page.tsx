'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Mail, Loader2, ToggleLeft, ToggleRight, Zap, Send } from 'lucide-react'
import { getWorkflows, createWorkflow, deleteWorkflow, toggleWorkflow } from '@/app/actions/workflows'

interface Workflow {
  id: number; name: string; trigger: string; triggerMinutes: number | null
  actionType: string; subject: string | null; message: string; isActive: boolean | null
}

export default function SmartFollowupPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', trigger: 'after_appointment', triggerMinutes: 1440,
    actionType: 'email', subject: 'Thank you for your appointment!', message: '',
  })
  const [preview, setPreview] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const w = await getWorkflows()
    setWorkflows(w.filter(f => f.trigger === 'after_appointment' || f.trigger === 'booking_confirmed') as any)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createWorkflow(form)
      setShowCreate(false)
      setForm({ name: '', trigger: 'after_appointment', triggerMinutes: 1440, actionType: 'email', subject: 'Thank you for your appointment!', message: '' })
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create follow-up') }
  }

  const templateExamples = [
    { name: 'Thank You', message: 'Hi {{customerName}}, thank you for booking with us! We look forward to seeing you on {{eventStart}}.' },
    { name: 'Appointment Follow-up', message: 'Hi {{customerName}}, we hope you enjoyed your {{duration}}-minute appointment. Please feel free to book again anytime!' },
    { name: 'Feedback Request', message: 'Hi {{customerName}}, we value your feedback! How was your experience with us?' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5" /> Smart Follow-Up
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Send branded follow-up emails to nurture leads and maintain relationships.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800">{error}</div>
        )}

        {/* Quick Templates */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Zap className="w-4 h-4" /> Quick Templates</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {templateExamples.map(t => (
              <button key={t.name} onClick={() => {
                setForm({ ...form, name: t.name, message: t.message })
                setShowCreate(true)
              }}
              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 text-left transition-all cursor-pointer">
                <p className="font-medium text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.message}</p>
              </button>
            ))}
          </div>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">New Follow-Up</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Send After</label>
                <select value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                  <option value="booking_confirmed">Booking Confirmed</option>
                  <option value="after_appointment">After Appointment</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Minutes after trigger</label>
                <input type="number" min={0} value={form.triggerMinutes} onChange={e => setForm({ ...form, triggerMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Action</label>
                <select value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>
            {form.actionType === 'email' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
                <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Message</label>
              <textarea required value={form.message} onChange={e => {
                setForm({ ...form, message: e.target.value })
                setPreview(e.target.value
                  .replace('{{customerName}}', 'John')
                  .replace('{{eventStart}}', 'Mon, Jun 15 at 10:00 AM')
                  .replace('{{duration}}', '30'))
              }}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none font-mono" rows={4} />
              <p className="text-xs text-muted-foreground mt-1">Use {'{{customerName}}'}, {'{{eventStart}}'}, {'{{duration}}'} as placeholders.</p>
            </div>
            {preview && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-medium text-foreground mb-1">Preview:</p>
                <p className="text-sm text-muted-foreground">{preview}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Your Follow-Ups</h2>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer">
            <Plus className="w-3 h-3" /> Create Follow-Up
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : workflows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Follow-Ups Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create automated follow-up emails or SMS to nurture your leads.</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Follow-Up</button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(w => (
              <div key={w.id} className="rounded-xl border border-border bg-card p-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{w.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {w.trigger === 'after_appointment' ? 'After appointment' : 'On booking'} 
                    {w.triggerMinutes ? ` (${w.triggerMinutes >= 1440 ? `${w.triggerMinutes / 1440} day(s)` : `${w.triggerMinutes} min`})` : ''}
                    {' | '}{w.actionType}
                  </p>
                  {w.subject && <p className="text-xs text-muted-foreground mt-0.5">Subject: {w.subject}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { await toggleWorkflow(w.id, !w.isActive); await loadData() }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${w.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {w.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={async () => { await deleteWorkflow(w.id); await loadData() }}
                    className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
