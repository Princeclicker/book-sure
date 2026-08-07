'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, Clock, ChevronLeft, ChevronRight, CheckCircle2, Phone, User, Mail, FileText, Send, ShieldCheck } from 'lucide-react'
import { getContrastText } from '@/lib/brand-utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface BookingFormProps {
  slug: string
  timezone: string
  workingHoursStart: number
  workingHoursEnd: number
  workingDays: number[]
  bufferMinutes: number
  brandColor?: string
  durationOptions?: number[]
}

export function BookingForm({
  slug,
  timezone,
  workingHoursStart,
  workingHoursEnd,
  workingDays,
  bufferMinutes,
  brandColor = '#3b82f6',
  durationOptions = [15, 30, 45, 60],
}: BookingFormProps) {
  const brandText = useMemo(() => getContrastText(brandColor), [brandColor])
  const [step, setStep] = useState<'duration' | 'date' | 'time' | 'details' | 'success'>('duration')
  const [duration, setDuration] = useState(30)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [manageToken, setManageToken] = useState<string | null>(null)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [isBusinessOwner, setIsBusinessOwner] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'valid' | 'invalid' | 'risky' | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '+250',
    notes: '',
  })

  const verifyEmailField = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus(null)
      return
    }
    setEmailVerifying(true)
    setEmailError(null)
    setEmailStatus(null)
    setCodeSent(false)
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setEmailStatus(data.status)
      if (data.status === 'invalid') {
        setEmailError(data.reason || 'Invalid email')
      }
    } catch {
      setEmailStatus('risky')
    } finally {
      setEmailVerifying(false)
    }
  }, [])

  const handleSendCode = useCallback(async () => {
    if (!formData.customerEmail) return
    setSendingCode(true)
    setError(null)
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.customerEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send code')
      }
      setCodeSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setSendingCode(false)
    }
  }, [formData.customerEmail])

  const isDateDisabled = useCallback((date: Date) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    if (dayStart.getTime() < now.getTime()) return true
    if (!workingDays.includes(date.getDay())) return true
    return false
  }, [workingDays])

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return
    setSelectedDate(date)
    setSelectedTime(null)
    setStep('time')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedDate || !selectedTime) {
      setError('Missing date or time')
      return
    }

    setEmailVerifying(true)
    setEmailError(null)
    setEmailStatus(null)
    let status = ''
    try {
      const verRes = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.customerEmail }),
      })
      const verData = await verRes.json()
      status = verData.status
      setEmailStatus(status)
      if (status === 'invalid') {
        setEmailError(verData.reason || 'Invalid email')
      }
    } catch {
      status = 'risky'
      setEmailStatus('risky')
    } finally {
      setEmailVerifying(false)
    }

    if (status === 'invalid') return
    if (status === 'risky' && !verificationCode) return

    setIsSubmitting(true)

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const eventStart = new Date(selectedDate)
      eventStart.setHours(hours, minutes, 0, 0)

      const body: Record<string, unknown> = {
        businessSlug: slug,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        eventStart: eventStart.toISOString(),
        duration,
        notes: formData.notes || undefined,
      }

      if (status === 'risky' && verificationCode) {
        body.verificationCode = verificationCode
      }

      const res = await fetch('/api/book/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.needsCode) {
          setEmailStatus('risky')
          throw new Error(data.error || 'Verification code required')
        }
        throw new Error(data.error || 'Failed to create appointment')
      }

      setManageToken(data.manageToken || null)
      setClientToken(data.clientToken || null)
      setIsBusinessOwner(data.isBusinessOwner || false)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Calendar helpers ──

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }, [currentMonth])

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  }, [currentMonth])

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }
    return days
  }, [firstDayOfMonth, daysInMonth, currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const isThisMonth = useMemo(() => {
    const now = new Date()
    return currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear()
  }, [currentMonth])

  // ── Duration step ──

  if (step === 'duration') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Select duration</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {durationOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => { setDuration(opt); setStep('date') }}
              className={`p-4 text-center rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                duration === opt
                  ? 'border-2 text-foreground'
                  : 'border-border hover:bg-accent hover:text-accent-foreground'
              }`}
              style={duration === opt ? { borderColor: brandColor, color: brandColor } : undefined}
            >
              <div className="text-lg font-bold">{opt}</div>
              <div className="text-xs text-muted-foreground mt-0.5">minutes</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Date step (month calendar) ──

  if (step === 'date') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep('duration')}
          className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
        >
          <ChevronLeft className="w-3 h-3" /> Change duration
        </button>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <CalendarDays className="w-4 h-4" />
          <span className="text-sm font-medium">Select a date</span>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              onClick={prevMonth}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[10px] sm:text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="p-2" />
              }
              const disabled = isDateDisabled(date)
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime()
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateSelect(date)}
                  disabled={disabled}
                  className={`p-2 text-center text-sm rounded-none transition-colors ${
                    disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : isSelected
                      ? 'text-white font-semibold'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer'
                  }`}
                  style={isSelected && !disabled ? { backgroundColor: brandColor } : undefined}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Time step (native input) ──

  const timeMin = `${String(workingHoursStart).padStart(2, '0')}:00`
  const timeMax = `${String(workingHoursEnd).padStart(2, '0')}:00`

  if (step === 'time') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => setStep('duration')}
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <ChevronLeft className="w-3 h-3" /> {duration} min
          </button>
          <span className="text-muted-foreground/40">|</span>
          <button
            onClick={() => setStep('date')}
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            Change date
          </button>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">
            {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div>
          <label htmlFor="time" className="text-sm font-medium text-foreground mb-2 block">
            Pick a start time
          </label>
          <input
            type="time"
            id="time"
            value={selectedTime || ''}
            onChange={(e) => setSelectedTime(e.target.value)}
            min={timeMin}
            max={timeMax}
            step="60"
            required
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Working hours: {timeMin} – {timeMax} | Duration: {duration} min
          </p>
        </div>

        <button
          onClick={() => {
            if (!selectedTime) {
              setError('Please pick a time')
              return
            }
            setError(null)
            setStep('details')
          }}
          disabled={!selectedTime}
          className="w-full h-10 rounded-lg font-medium text-sm transition-all disabled:opacity-50 hover:brightness-90 cursor-pointer"
          style={{ backgroundColor: brandColor, color: brandText }}
        >
          Continue
        </button>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // ── Details step ──

  if (step === 'details') {
    const needsCode = emailStatus === 'risky' || (emailStatus === 'risky' && !codeSent)
    const canSubmit = !emailVerifying && (emailStatus !== 'risky' || (codeSent && verificationCode.length === 6))

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setStep('time')
            setEmailStatus(null)
            setCodeSent(false)
          }}
          className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
        >
          <ChevronLeft className="w-3 h-3" /> Change time
        </button>

        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-foreground">
            {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' '}at{' '}
            {selectedTime}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{duration} minutes</p>
        </div>

        <div>
          <label htmlFor="name" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            required
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            placeholder="+250 7XX XXX XXX"
          />
          <p className="text-xs text-muted-foreground mt-1">We&apos;ll send your confirmation via SMS</p>
        </div>

        <div>
          <label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              required
              value={formData.customerEmail}
              onChange={(e) => {
                setFormData({ ...formData, customerEmail: e.target.value })
                setEmailTouched(true)
                setEmailStatus(null)
                setEmailError(null)
                setCodeSent(false)
              }}
              onBlur={() => {
                setEmailTouched(true)
                if (formData.customerEmail) verifyEmailField(formData.customerEmail)
              }}
              className={`w-full px-3 py-2 rounded-lg border text-foreground text-sm focus:outline-none focus:ring-2 focus:border-ring placeholder:text-muted-foreground ${
                emailError && emailTouched
                  ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-950/30'
                  : emailStatus === 'risky'
                  ? 'border-amber-400 focus:ring-amber-400 bg-amber-50 dark:bg-amber-950/30'
                  : emailStatus === 'valid'
                  ? 'border-green-400 focus:ring-green-400 bg-green-50 dark:bg-green-950/30'
                  : 'border-input focus:ring-ring bg-background'
              }`}
              placeholder="your@email.com"
            />
            {emailVerifying && (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {!emailVerifying && emailStatus === 'valid' && (
              <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
            )}
            {!emailVerifying && emailStatus === 'risky' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 text-xs font-medium">?</span>
            )}
          </div>
          {emailError && emailTouched ? (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          ) : emailStatus === 'valid' ? (
            <p className="text-xs text-green-600 mt-1">Email verified</p>
          ) : emailStatus === 'risky' ? (
            <p className="text-xs text-amber-600 mt-1">This email could not be automatically verified. Please confirm with a code.</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">We&apos;ll send your booking confirmation here</p>
          )}
        </div>

        {emailStatus === 'risky' && (
          <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Email verification required</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  We couldn&apos;t automatically verify this email. Please send a verification code to confirm.
                </p>
              </div>
            </div>

            {!codeSent ? (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="w-full h-10 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: brandColor, color: brandText }}
              >
                {sendingCode ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Verification Code
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Enter verification code
                </label>
                <input
                  type="text"
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2.5 rounded-lg border border-amber-300 bg-white dark:bg-amber-950 text-amber-900 dark:text-amber-100 text-lg font-bold tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder:text-amber-300"
                />
                <p className="text-xs text-amber-600">Check your email (or console in dev mode) for the 6-digit code. Expires in 10 minutes.</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground resize-none"
            placeholder="Anything you'd like to add..."
            rows={3}
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="w-full h-10 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-90 focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer"
          style={{ backgroundColor: brandColor, color: brandText }}
        >
          {emailVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Verifying email...
            </span>
          ) : isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              Booking...
            </span>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </form>
    )
  }

  // ── Success step ──

  return (
    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-xl font-semibold text-green-900 dark:text-green-50 mb-2">
        Booking Confirmed!
      </h2>
      <p className="text-sm text-green-800 dark:text-green-200 mb-6">
        A confirmation SMS has been sent to {formData.customerPhone}
      </p>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 text-left space-y-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Date:</span>{' '}
          {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Time:</span> {selectedTime}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Duration:</span> {duration} minutes
        </p>
        {manageToken && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-green-200 dark:border-green-800 mt-2">
            Manage this appointment:{' '}
            <a
              href={`/manage/${manageToken}`}
              style={{ color: brandColor }}
              className="underline font-medium"
            >
              View / Edit
            </a>
          </p>
        )}
        {isBusinessOwner ? (
          <p className="text-xs text-muted-foreground mt-1">
            Go to your{' '}
            <a
              href="/dashboard"
              style={{ color: brandColor }}
              className="underline font-medium"
            >
              main dashboard
            </a>{' '}
            to see all your appointments
          </p>
        ) : clientToken && (
          <p className="text-xs text-muted-foreground mt-1">
            All my appointments:{' '}
            <a
              href={`/client/dashboard/${slug}/${clientToken}`}
              style={{ color: brandColor }}
              className="underline font-medium"
            >
              Go to Dashboard
            </a>
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setStep('duration')
          setSelectedDate(null)
          setSelectedTime(null)
          setDuration(30)
          setFormData({ customerName: '', customerEmail: '', customerPhone: '+250', notes: '' })
        }}
        className="px-6 py-2.5 rounded-lg font-medium text-sm transition-all hover:brightness-90 cursor-pointer"
        style={{ backgroundColor: brandColor, color: brandText }}
      >
        Book Another Appointment
      </button>
    </div>
  )
}
