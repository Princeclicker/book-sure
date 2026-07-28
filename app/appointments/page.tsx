'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, X, ChevronLeft, ChevronRight,
  Phone, Mail, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Bell, FileText, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppointmentActions } from '@/components/appointment-actions'

interface Appointment {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  eventStart: string
  eventEnd: string
  duration: number
  status: string
  notes: string | null
  manageToken: string | null
  confirmationSent: boolean
  reminderSent: boolean
  cancelledViaSms: boolean
  createdAt: string
}

interface SearchResult {
  appointments: Appointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
]

const DURATION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '60 min' },
]

export default function AppointmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const duration = searchParams.get('duration') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const [searchInput, setSearchInput] = useState(search)

  const buildUrl = useCallback((params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    return `/appointments?${sp.toString()}`
  }, [searchParams])

  const navigate = useCallback((params: Record<string, string>) => {
    router.push(buildUrl(params))
  }, [router, buildUrl])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const sp = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) sp.set('search', search)
    if (status) sp.set('status', status)
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
    if (duration) sp.set('duration', duration)

    fetch(`/api/appointments/search?${sp.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [search, status, from, to, duration, page, limit])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({ search: searchInput, page: '1' })
  }

  const handleClear = () => {
    setSearchInput('')
    router.push('/appointments')
  }

  const setFilter = (key: string, value: string) => {
    navigate({ [key]: value, page: '1' })
  }

  const hasActiveFilters = search || status || from || to || duration

  const activeFilterTags: { label: string; onRemove: () => void }[] = []
  if (search) activeFilterTags.push({ label: `Search: "${search}"`, onRemove: () => setFilter('search', '') })
  if (status) activeFilterTags.push({ label: STATUS_OPTIONS.find(o => o.value === status)?.label || status, onRemove: () => setFilter('status', '') })
  if (from) activeFilterTags.push({ label: `From: ${from}`, onRemove: () => setFilter('from', '') })
  if (to) activeFilterTags.push({ label: `To: ${to}`, onRemove: () => setFilter('to', '') })
  if (duration) activeFilterTags.push({ label: `${duration} min`, onRemove: () => setFilter('duration', '') })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" size="sm">Search</Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter('status', opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors cursor-pointer ${
                  status === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <span className="text-xs text-muted-foreground font-medium ml-2">Duration:</span>
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter('duration', opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors cursor-pointer ${
                  duration === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Date range:</span>
            <input
              type="date"
              value={from}
              onChange={e => setFilter('from', e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={to}
              onChange={e => setFilter('to', e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {activeFilterTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilterTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-0.5 rounded-full">
                  {tag.label}
                  <button onClick={tag.onRemove} className="hover:text-destructive cursor-pointer">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading appointments...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-6 text-center mt-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="flex items-center justify-between mt-6 mb-3">
              <p className="text-sm text-muted-foreground">
                {data.total} {data.total === 1 ? 'appointment' : 'appointments'}
                {hasActiveFilters && ' found'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show:</span>
                {[10, 25, 50].map(n => (
                  <button
                    key={n}
                    onClick={() => setFilter('limit', String(n))}
                    className={`text-xs px-2 py-0.5 rounded font-medium cursor-pointer ${
                      limit === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {data.appointments.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No appointments match your filters</p>
                {hasActiveFilters && (
                  <button onClick={handleClear} className="text-sm text-primary hover:underline cursor-pointer">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {data.appointments.map(apt => (
                  <AppointmentCard key={apt.id} apt={apt} />
                ))}
              </div>
            )}

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setFilter('page', String(page - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" /> Previous
                </button>

                {Array.from({ length: data.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === data.totalPages || Math.abs(p - page) <= 2)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center">
                      {i > 0 && arr[i - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">...</span>}
                      <button
                        onClick={() => setFilter('page', String(p))}
                        className={`text-sm px-2.5 py-1 rounded font-medium cursor-pointer ${
                          p === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}

                <button
                  onClick={() => setFilter('page', String(page + 1))}
                  disabled={page >= data.totalPages}
                  className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AppointmentCard({ apt }: { apt: Appointment }) {
  const isUpcoming = apt.status === 'confirmed' && new Date(apt.eventStart) > new Date()
  const isConfirmed = apt.status === 'confirmed'
  const isCancelled = apt.status === 'cancelled'
  const startDate = new Date(apt.eventStart)

  return (
    <div className={`rounded-xl border bg-card p-4 sm:p-5 ${
      isCancelled ? 'border-red-200 dark:border-red-900 opacity-70' :
      isUpcoming ? 'border-primary/20' : 'border-border'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{apt.customerName}</h3>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isCancelled ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
              isConfirmed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
            }`}>
              {isCancelled ? <XCircle className="w-3 h-3" /> :
               isConfirmed ? <CheckCircle2 className="w-3 h-3" /> :
               <AlertCircle className="w-3 h-3" />}
              {apt.status}
            </span>
            {apt.reminderSent && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                <Bell className="w-3 h-3" /> Reminder sent
              </span>
            )}
            {apt.cancelledViaSms && (
              <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded-full">
                SMS cancel
              </span>
            )}
            {apt.confirmationSent && isConfirmed && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Confirmed via SMS
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {apt.customerPhone}
            </span>
            {apt.customerEmail && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {apt.customerEmail}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{apt.duration}min
            </span>
          </div>

          {apt.notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-1.5 rounded-md line-clamp-2">
              <FileText className="w-3 h-3 inline mr-1" />
              {apt.notes}
            </p>
          )}
        </div>

        <div className="text-left sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-2">
          {isUpcoming && (
            <AppointmentActions appointmentId={apt.id} />
          )}
          {apt.manageToken && (
            <a
              href={`/manage/${apt.manageToken}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Manage
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
