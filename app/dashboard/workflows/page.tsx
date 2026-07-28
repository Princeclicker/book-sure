'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Zap, Loader2, ToggleLeft, ToggleRight,
  Mail, Smartphone, Bell, Settings, Users, FileText, CheckSquare,
  Pencil, X, BarChart3, Clock, AlertCircle,
} from 'lucide-react'
import {
  getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,
  toggleWorkflow, getWorkflowStatsAction,
} from '@/app/actions/workflows'

interface WorkflowAction {
  id?: number
  actionType: string
  subject?: string | null
  message: string
  config?: Record<string, unknown>
  sortOrder?: number
}

interface Workflow {
  id: number
  name: string
  description?: string | null
  trigger: string
  triggerMinutes: number | null
  actionType: string
  subject: string | null
  message: string
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
  actions?: WorkflowAction[]
}

interface WorkflowStats {
  totalWorkflows: number
  activeWorkflows: number
  disabledWorkflows: number
  emailsSent: number
  smsSent: number
  successfulExecutions: number
  failedExecutions: number
}

const TRIGGER_OPTIONS = [
  { value: 'booking_confirmed', label: 'Appointment Booked' },
  { value: 'appointment_cancelled', label: 'Appointment Cancelled' },
  { value: 'appointment_rescheduled', label: 'Appointment Rescheduled' },
  { value: 'appointment_completed', label: 'Appointment Completed' },
  { value: 'appointment_no_show', label: 'Appointment No-Show' },
]

const ACTION_OPTIONS = [
  { value: 'email', label: 'Send Email', icon: Mail, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'sms', label: 'Send SMS', icon: Smartphone, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'internal_notification', label: 'Internal Notification', icon: Bell, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  { value: 'update_status', label: 'Update Appointment Status', icon: Settings, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'assign_team', label: 'Assign Team Member', icon: Users, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'add_note', label: 'Add Internal Note', icon: FileText, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'create_task', label: 'Create Follow-up Task', icon: CheckSquare, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
]

const TRIGGER_VARIABLES = [
  '{{customer_name}}', '{{customer_email}}', '{{customer_phone}}',
  '{{service_name}}', '{{appointment_date}}', '{{appointment_time}}',
  '{{business_name}}', '{{staff_name}}', '{{booking_reference}}',
  '{{duration}}', '{{notes}}',
]

function emptyAction(): WorkflowAction {
  return { actionType: 'email', subject: '', message: '', config: {}, sortOrder: 0 }
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTrigger, setFormTrigger] = useState('booking_confirmed')
  const [formActions, setFormActions] = useState<WorkflowAction[]>([emptyAction()])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [w, s] = await Promise.all([getWorkflows(), getWorkflowStatsAction()])
    setWorkflows(w as Workflow[])
    setStats(s as WorkflowStats)
    setLoading(false)
  }

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormTrigger('booking_confirmed')
    setFormActions([emptyAction()])
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  function startEdit(wf: Workflow) {
    setEditingId(wf.id)
    setFormName(wf.name)
    setFormDescription(wf.description || '')
    setFormTrigger(wf.trigger)
    setFormActions(wf.actions && wf.actions.length > 0
      ? wf.actions.map(a => ({
          id: a.id,
          actionType: a.actionType,
          subject: a.subject || '',
          message: a.message,
          config: typeof a.config === 'string' ? JSON.parse(a.config) : (a.config || {}),
          sortOrder: a.sortOrder,
        }))
      : [{ actionType: wf.actionType, subject: wf.subject || '', message: wf.message, config: {}, sortOrder: 0 }]
    )
    setShowForm(true)
  }

  function addAction() {
    setFormActions([...formActions, emptyAction()])
  }

  function removeAction(idx: number) {
    if (formActions.length <= 1) return
    setFormActions(formActions.filter((_, i) => i !== idx))
  }

  function updateAction(idx: number, field: keyof WorkflowAction, value: unknown) {
    const updated = [...formActions]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormActions(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!formName.trim()) { setError('Workflow name is required'); return }
    if (formActions.some(a => !a.message.trim())) { setError('All actions must have a message'); return }

    try {
      if (editingId) {
        await updateWorkflow(editingId, {
          name: formName,
          description: formDescription || undefined,
          trigger: formTrigger,
          actions: formActions.map(a => ({
            id: a.id,
            actionType: a.actionType,
            subject: a.subject || undefined,
            message: a.message,
            config: a.config,
            sortOrder: a.sortOrder,
          })),
        })
      } else {
        await createWorkflow({
          name: formName,
          description: formDescription || undefined,
          trigger: formTrigger,
          actions: formActions.map(a => ({
            actionType: a.actionType,
            subject: a.subject || undefined,
            message: a.message,
            config: a.config,
            sortOrder: a.sortOrder,
          })),
        })
      }
      resetForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow')
    }
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
              <Zap className="w-5 h-5" /> Workflows & Automation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Automate email and SMS communication for your appointments.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/workflows/history" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Clock className="w-4 h-4" /> History
            </Link>
            <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="w-4 h-4" /> Create Workflow
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox label="Total Workflows" value={stats.totalWorkflows} />
            <StatBox label="Active" value={stats.activeWorkflows} color="text-green-600" />
            <StatBox label="Emails Sent" value={stats.emailsSent} icon={<Mail className="w-3 h-3" />} />
            <StatBox label="SMS Sent" value={stats.smsSent} icon={<Smartphone className="w-3 h-3" />} />
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{editingId ? 'Edit Workflow' : 'New Workflow'}</h2>
              <button type="button" onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Workflow Name *</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                  placeholder="Welcome Email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                  placeholder="Send welcome email after booking" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Trigger *</label>
              <select value={formTrigger} onChange={e => setFormTrigger(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Actions</label>
                <button type="button" onClick={addAction} className="text-xs text-primary hover:underline cursor-pointer">+ Add Action</button>
              </div>
              <div className="space-y-3">
                {formActions.map((action, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Action {idx + 1}</span>
                      {formActions.length > 1 && (
                        <button type="button" onClick={() => removeAction(idx)} className="text-muted-foreground hover:text-red-500 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <select value={action.actionType} onChange={e => updateAction(idx, 'actionType', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                      {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {(action.actionType === 'email') && (
                      <input type="text" value={action.subject || ''} onChange={e => updateAction(idx, 'subject', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                        placeholder="Email subject line" />
                    )}
                    {action.actionType === 'update_status' && (
                      <select value={(action.config?.status as string) || 'completed'} onChange={e => updateAction(idx, 'config', { ...action.config, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No-Show</option>
                      </select>
                    )}
                    {action.actionType === 'assign_team' && (
                      <input type="text" value={(action.config?.memberName as string) || ''} onChange={e => updateAction(idx, 'config', { ...action.config, memberName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                        placeholder="Team member name" />
                    )}
                    {action.actionType === 'add_note' && (
                      <input type="text" value={(action.config?.note as string) || ''} onChange={e => updateAction(idx, 'config', { ...action.config, note: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                        placeholder="Note content" />
                    )}
                    <textarea value={action.message} onChange={e => updateAction(idx, 'message', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none font-mono" rows={3}
                      placeholder="Message content with {{variables}}" />
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 rounded bg-muted/30 border border-dashed border-border">
                <p className="text-[11px] text-muted-foreground mb-1">Available variables:</p>
                <div className="flex flex-wrap gap-1">
                  {TRIGGER_VARIABLES.map(v => (
                    <code key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{v}</code>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">
                {editingId ? 'Save Changes' : 'Create Workflow'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        {workflows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Workflows Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create automated email or SMS messages for your appointments.</p>
            <button onClick={() => { resetForm(); setShowForm(true) }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Workflow</button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => {
              const triggerLabel = TRIGGER_OPTIONS.find(o => o.value === wf.trigger)?.label || wf.trigger
              return (
                <div key={wf.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{wf.name}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wf.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {wf.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      {wf.description && <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Trigger: <span className="font-medium">{triggerLabel}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ACTION_OPTIONS.filter(a =>
                          wf.actions ? wf.actions.some(wa => wa.actionType === a.value) : a.value === wf.actionType
                        ).map(a => {
                          const Icon = a.icon
                          return (
                            <span key={a.value} className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${a.color}`}>
                              <Icon className="w-2.5 h-2.5" /> {a.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <button onClick={() => startEdit(wf)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={async () => { await toggleWorkflow(wf.id, !wf.isActive); await loadData() }}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${wf.isActive ? 'text-primary' : 'text-muted-foreground'}`}
                        title={wf.isActive ? 'Deactivate' : 'Activate'}>
                        {wf.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={async () => { if (confirm('Delete this workflow?')) { await deleteWorkflow(wf.id); await loadData() } }}
                        className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  )
}
