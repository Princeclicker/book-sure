'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, FileText,
} from 'lucide-react'
import { ClientUpsell } from '@/components/client-upsell'

interface AppointmentItem {
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
  createdAt: string
  businessName: string
  businessSlug: string
  brandColor: string | null
}

interface DashboardData {
  appointments: AppointmentItem[]
  upcoming: AppointmentItem[]
  past: AppointmentItem[]
}

function ClientDashboardContent() {
  const { slug, token } = useParams<{ slug: string; token: string }>()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !slug) {
      setError('This link is missing your access token. Please use the link from your confirmation email.')
      setLoading(false)
      return
    }
    console.log('[ClientDashboard] Fetching appointments:', { token, slug })
    fetch(`/api/client-appointments/list?token=${token}&slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          console.log('[ClientDashboard] Loaded', data.appointments?.length, 'appointments')
          setData(data)
        }
      })
      .catch(() => setError('Failed to load appointments'))
      .finally(() => setLoading(false))
  }, [token, slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">No Appointments Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {error || 'This link is invalid or you have no appointments.'}
          </p>
          <div className="text-sm text-muted-foreground space-y-2 mb-6">
            <p>To access your appointments:</p>
            <ol className="list-decimal text-left space-y-1 pl-5">
              <li>Check your confirmation email for the correct link</li>
              <li>The link includes your unique access token</li>
              <li>If you don't have a confirmation email, please contact the business directly</li>
            </ol>
          </div>
          <a href="/" className="text-sm text-primary hover:underline">Go to Homepage</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your bookings
          </p>
        </div>

        {data.upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground mb-3">
              Upcoming ({data.upcoming.length})
            </h2>
            <div className="space-y-3">
              {data.upcoming.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          </section>
        )}

        {data.past.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground mb-3">
              Past ({data.past.length})
            </h2>
            <div className="space-y-3">
              {data.past.map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          </section>
        )}

        {data.appointments.length === 0 && (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No appointments yet.</p>
            <p className="text-sm text-muted-foreground">
              When you book an appointment, it will appear here. You can also check your confirmation email for details.
            </p>
          </div>
        )}

        <ClientUpsell />
      </div>
    </div>
  )
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ClientDashboardContent />
    </Suspense>
  )
}

function AppointmentCard({ appointment }: { appointment: AppointmentItem }) {
  const startDate = new Date(appointment.eventStart)
  const endDate = new Date(appointment.eventEnd)
  const isPast = startDate.getTime() < Date.now()
  const isCancelled = appointment.status === 'cancelled'
  const isDisabled = isPast || isCancelled
  const notesEdited = appointment.notesUpdatedAt && appointment.notesUpdatedAt !== appointment.createdAt
  const cardBrand = appointment.brandColor || '#3b82f6'

  return (
    <div className={`rounded-xl border ${isCancelled ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30' : 'border-border bg-card'} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isCancelled
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                : isPast
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            }`}>
              {isCancelled ? <XCircle className="w-3 h-3" /> :
               isPast ? <CheckCircle2 className="w-3 h-3" /> :
               <CheckCircle2 className="w-3 h-3" />}
              {isCancelled ? 'Cancelled' : isPast ? 'Completed' : 'Confirmed'}
            </span>
            {notesEdited && (
              <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <FileText className="w-3 h-3" /> Notes
              </span>
            )}
            {appointment.rescheduledFrom && (
              <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                Rescheduled
              </span>
            )}
          </div>

          <p className="text-sm font-medium" style={{ color: cardBrand }}>
            {appointment.businessName}
          </p>

          <p className="text-sm text-foreground font-medium">
            {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>({appointment.duration}min)</span>
          </div>
        </div>

        <a
          href={appointment.manageToken ? `/manage/${appointment.manageToken}` : '#'}
          className={`shrink-0 inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isDisabled
              ? 'text-muted-foreground cursor-not-allowed'
              : 'hover:opacity-80'
          }`}
          style={{ color: isDisabled ? undefined : cardBrand }}
          onClick={e => { if (isDisabled) e.preventDefault() }}
        >
          Details <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
