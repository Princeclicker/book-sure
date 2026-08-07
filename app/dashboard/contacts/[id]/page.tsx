'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, Building2, Calendar, DollarSign, Clock, Edit2, Plus, FileText,
  Users, CheckCircle, CheckSquare, TrendingUp, Award, XCircle, Loader2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getContact, updateContact, addTimelineEvent } from '@/app/actions/contacts'

interface TimelineEvent {
  id: number
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

interface ContactData {
  id: number
  name: string
  email: string | null
  phone: string | null
  company: string | null
  profession: string | null
  status: string | null
  source: string | null
  tags: string[] | null
  notes: string | null
  totalAppointments: number | null
  totalRevenue: number | null
  firstContactAt: Date | null
  lastContactAt: Date | null
  createdAt: Date
  timeline: TimelineEvent[]
}

const STATUS_STYLES: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  contact_created: <Users className="w-4 h-4" />,
  appointment_booked: <Calendar className="w-4 h-4" />,
  appointment_completed: <CheckCircle className="w-4 h-4" />,
  invoice_sent: <FileText className="w-4 h-4" />,
  payment_received: <DollarSign className="w-4 h-4" />,
  task_created: <CheckSquare className="w-4 h-4" />,
  task_completed: <CheckCircle className="w-4 h-4" />,
  opportunity_created: <TrendingUp className="w-4 h-4" />,
  opportunity_won: <Award className="w-4 h-4" />,
  opportunity_lost: <XCircle className="w-4 h-4" />,
  note_added: <FileText className="w-4 h-4" />,
}

const TIMELINE_COLORS: Record<string, string> = {
  contact_created: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  appointment_booked: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  appointment_completed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  invoice_sent: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  payment_received: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
  task_created: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  task_completed: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  opportunity_created: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400',
  opportunity_won: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
  opportunity_lost: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  note_added: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function ContactDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [contact, setContact] = useState<ContactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const loadContact = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await getContact(id)
      if (result) {
        setContact(result as unknown as ContactData)
      }
    } catch {
      setError('Failed to load contact')
    }
    setLoading(false)
  }, [id])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadContact() }, [loadContact])

  function startEditing() {
    if (!contact) return
    setEditName(contact.name)
    setEditEmail(contact.email || '')
    setEditPhone(contact.phone || '')
    setEditCompany(contact.company || '')
    setEditStatus(contact.status || 'lead')
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateContact(id, {
        name: editName,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        company: editCompany || undefined,
        status: editStatus || undefined,
      })
      setEditing(false)
      await loadContact()
    } catch {
      setError('Failed to save contact')
    }
    setSaving(false)
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    try {
      await addTimelineEvent({
        contactId: id,
        eventType: 'note_added',
        title: 'Note added',
        description: noteText,
      })
      setNoteText('')
      setShowNote(false)
      await loadContact()
    } catch {
      setError('Failed to add note')
    }
    setAddingNote(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">The contact you are looking for does not exist.</p>
          <Link href="/dashboard/contacts" className="text-sm text-primary hover:underline">Back to Contacts</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/contacts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Contacts
        </Link>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                {editing ? (
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-lg font-bold mb-1"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {editing ? (
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize border border-border bg-background text-foreground"
                    >
                      <option value="lead">Lead</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="vip">VIP</option>
                    </select>
                  ) : contact.status ? (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[contact.status] || 'bg-muted text-muted-foreground'}`}>
                      {contact.status}
                    </span>
                  ) : null}
                  {contact.source && (
                    <span className="text-[10px] text-muted-foreground">
                      via {contact.source}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="cursor-pointer">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="cursor-pointer">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={startEditing} className="flex items-center gap-1.5 cursor-pointer">
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNote(true)} className="flex items-center gap-1.5 cursor-pointer">
                    <Plus className="w-3 h-3" /> Add Note
                  </Button>
                </>
              )}
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company</label>
                <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Company name" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-border">
            {contact.email && !editing && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && !editing && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.phone}</span>
              </div>
            )}
            {contact.company && !editing && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" /> Appointments
              </div>
              <p className="text-lg font-bold text-foreground">{contact.totalAppointments ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" /> Revenue
              </div>
              <p className="text-lg font-bold text-foreground">${((contact.totalRevenue ?? 0) / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" /> First Contact
              </div>
              <p className="text-sm font-medium text-foreground">
                {contact.firstContactAt ? new Date(contact.firstContactAt).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" /> Last Contact
              </div>
              <p className="text-sm font-medium text-foreground">
                {contact.lastContactAt ? new Date(contact.lastContactAt).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </div>

        {showNote && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Add Note</h3>
              <button onClick={() => { setShowNote(false); setNoteText('') }} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Write a note about this contact..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="cursor-pointer">
                {addingNote ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                Save Note
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNote(false); setNoteText('') }} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Timeline</h2>
          {contact.timeline.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contact.timeline.map(event => (
                <div key={event.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TIMELINE_COLORS[event.eventType] || 'bg-muted text-muted-foreground'}`}>
                    {TIMELINE_ICONS[event.eventType] || <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
