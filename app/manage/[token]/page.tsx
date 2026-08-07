'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import {
  CalendarDays, Clock, User, Phone, Mail, FileText, AlertCircle,
  CheckCircle2, XCircle, ArrowLeft, ExternalLink, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const NOTES_MAX_LENGTH = 500

interface AppointmentData {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  eventStart: string
  eventEnd: string
  duration: number
  status: string
  notes: string | null
  notesUpdatedAt: string | null
  rescheduledFrom: string | null
  manageToken: string | null
  clientToken: string | null
  createdAt: string
  businessSlug: string | null
}

export default function ManageAppointmentPage() {
  const { token } = useParams<{ token: string }>()
  const { data: session } = useSession()

  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesMessage, setNotesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleMessage, setRescheduleMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelMessage, setCancelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/client-appointment/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setAppointment(data.appointment)
          setNotes(data.appointment.notes || '')
        }
      })
      .catch(() => setError('Failed to load appointment'))
      .finally(() => setLoading(false))
  }, [token])

  // eslint-disable-next-line react-hooks/purity
  const isPast = appointment && new Date(appointment.eventStart).getTime() < Date.now()
  const isCancelled = appointment?.status === 'cancelled'
  const isReadOnly = isPast || isCancelled
  const notesEditedByClient = appointment?.notesUpdatedAt && appointment?.notesUpdatedAt !== appointment?.createdAt

  async function handleSaveNotes() {
    setSavingNotes(true)
    setNotesMessage(null)
    try {
      const res = await fetch(`/api/client-appointment/${token}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save notes')
      setNotesMessage({ type: 'success', text: 'Notes saved!' })
      setAppointment(prev => prev ? { ...prev, notes, notesUpdatedAt: new Date().toISOString() } : prev)
    } catch (err) {
      setNotesMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return
    setRescheduling(true)
    setRescheduleMessage(null)
    try {
      const [hours, minutes] = newTime.split(':').map(Number)
      const eventStart = new Date(newDate)
      eventStart.setHours(hours, minutes, 0, 0)

      const res = await fetch(`/api/client-appointment/${token}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventStart: eventStart.toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule')
      setAppointment(prev => prev ? { ...prev, eventStart: data.eventStart, eventEnd: data.eventEnd } : prev)
      setRescheduleMessage({ type: 'success', text: 'Appointment rescheduled!' })
      setShowReschedule(false)
    } catch (err) {
      setRescheduleMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reschedule' })
    } finally {
      setRescheduling(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setCancelMessage(null)
    try {
      const res = await fetch(`/api/client-appointment/${token}/cancel`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : prev)
      setCancelMessage({ type: 'success', text: 'Appointment cancelled.' })
      setShowCancelConfirm(false)
    } catch (err) {
      setCancelMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel' })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Appointment Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">{error || 'This link is invalid or the appointment no longer exists.'}</p>
          <Link href="/" className="text-sm text-primary hover:underline">Go Home</Link>
        </div>
      </div>
    )
  }

  const startDate = new Date(appointment.eventStart)
  const endDate = new Date(appointment.eventEnd)

  const backHref = session
    ? '/dashboard'
    : appointment.clientToken && appointment.businessSlug
      ? `/client/dashboard/${appointment.businessSlug}/${appointment.clientToken}`
      : '/'

  function handleBack(e: React.MouseEvent) {
    const ref = document.referrer
    if (ref) {
      try {
        const url = new URL(ref)
        if (url.origin === window.location.origin) {
          e.preventDefault()
          window.location.href = ref
        }
      } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <a
          href={backHref}
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </a>

        <h1 className="text-2xl font-bold text-foreground mb-2">Manage Appointment</h1>
        <p className="text-sm text-muted-foreground mb-8">
          View or make changes to your appointment
        </p>

        {isCancelled && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">This appointment has been cancelled</p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">Appointment Details</h2>

            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium">{appointment.customerName}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">
                {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">
                {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' ('}{appointment.duration}min)
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{appointment.customerPhone}</span>
            </div>

            {appointment.customerEmail && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{appointment.customerEmail}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                appointment.status === 'confirmed'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : appointment.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
              }`}>
                {appointment.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> :
                 appointment.status === 'cancelled' ? <XCircle className="w-3 h-3" /> :
                 <AlertCircle className="w-3 h-3" />}
                {appointment.status}
              </span>
              {notesEditedByClient && (
                <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                  Notes updated
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Notes
              </label>
              <span className="text-xs text-muted-foreground">{notes.length}/{NOTES_MAX_LENGTH}</span>
            </div>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isReadOnly}
              maxLength={NOTES_MAX_LENGTH}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={isReadOnly ? 'Cannot edit notes for this appointment' : 'Add any special requests or instructions...'}
            />
            {!isReadOnly && (
              <div className="flex items-center justify-between">
                <div>
                  {notesMessage && (
                    <p className={`text-xs ${notesMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {notesMessage.text}
                    </p>
                  )}
                </div>
                <Button onClick={handleSaveNotes} disabled={savingNotes || notes === (appointment.notes || '')} size="sm">
                  {savingNotes ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : 'Save Notes'}
                </Button>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <>
              <div className="border-t border-border pt-5 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Reschedule</h3>
                {!showReschedule ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowReschedule(true)}
                    className="w-full"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Choose New Date & Time
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <label htmlFor="new-date" className="text-xs text-muted-foreground block mb-1">Date</label>
                      <input
                        id="new-date"
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-time" className="text-xs text-muted-foreground block mb-1">Time</label>
                      <input
                        id="new-time"
                        type="time"
                        value={newTime}
                        onChange={e => setNewTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleReschedule} disabled={rescheduling || !newDate || !newTime} className="flex-1">
                        {rescheduling ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Rescheduling...
                          </span>
                        ) : 'Confirm Reschedule'}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowReschedule(false)} disabled={rescheduling}>
                        Cancel
                      </Button>
                    </div>
                    {rescheduleMessage && (
                      <p className={`text-xs ${rescheduleMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {rescheduleMessage.text}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-5 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Cancel Appointment</h3>
                {!showCancelConfirm ? (
                  <Button variant="destructive" onClick={() => setShowCancelConfirm(true)} className="w-full">
                    <XCircle className="w-4 h-4" />
                    Cancel This Appointment
                  </Button>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 space-y-3">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="flex-1">
                        {cancelling ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Cancelling...
                          </span>
                        ) : 'Yes, Cancel'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
                        Keep Appointment
                      </Button>
                    </div>
                    {cancelMessage && (
                      <p className={`text-xs ${cancelMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {cancelMessage.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
