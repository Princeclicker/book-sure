'use client'

import { useState, useEffect } from 'react'
import { getPollByToken, submitVote } from '@/app/actions/polls'
import { CalendarClock, CheckCircle2, Clock, Loader2 } from 'lucide-react'

interface PollData {
  id: number; title: string; description: string | null; duration: number | null
  proposedDates: string[]; timeStart: number | null; timeEnd: number | null
  status: string | null; shareToken: string | null
  votes: { id: number; voterName: string; selectedSlots: string[] }[]
}

export default function PollVotePage({ params }: { params: Promise<{ token: string }> }) {
  const [poll, setPoll] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [voterName, setVoterName] = useState('')
  const [voterEmail, setVoterEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPoll()
  }, [])

  async function loadPoll() {
    const { token } = await params
    const p = await getPollByToken(token)
    if (!p) { setError('Poll not found'); setLoading(false); return }
    setPoll(p as any)
    setLoading(false)
  }

  function toggleSlot(slot: string) {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!voterName || selectedSlots.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const { token } = await params
      await submitVote({
        token,
        voterName,
        voterEmail: voterEmail || undefined,
        selectedSlots,
        notes: notes || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (error && !poll) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  )

  if (!poll) return null

  if (success) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-green-900 dark:text-green-50 mb-2">Vote Submitted!</h2>
        <p className="text-sm text-green-800 dark:text-green-200">Your availability has been recorded. The organizer will be notified.</p>
      </div>
    </div>
  )

  if (poll.status === 'closed') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Poll Closed</h2>
        <p className="text-sm text-muted-foreground">This meeting poll is no longer accepting votes.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center mb-8">
          <CalendarClock className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">{poll.title}</h1>
          {poll.description && <p className="text-muted-foreground mt-1">{poll.description}</p>}
          <p className="text-sm text-muted-foreground mt-2">
            Duration: {poll.duration} min | {poll.timeStart}:00 – {poll.timeEnd}:00
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Select Your Availability</h2>
            {poll.proposedDates.map(date => {
              const slots: string[] = []
              for (let h = poll.timeStart || 9; h < (poll.timeEnd || 17); h++) {
                slots.push(`${date}T${String(h).padStart(2, '0')}:00`)
              }
              return (
                <div key={date}>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => {
                      const time = new Date(slot).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            selectedSlots.includes(slot)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:bg-accent'
                          }`}
                        >
                          <Clock className="w-3 h-3 inline mr-1" />{time}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Your Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Your Name *</label>
                <input type="text" required value={voterName} onChange={e => setVoterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={voterEmail} onChange={e => setVoterEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" />
            </div>
          </div>

          <button type="submit" disabled={submitting || selectedSlots.length === 0}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            {submitting ? 'Submitting...' : `Submit Vote (${selectedSlots.length} slots selected)`}
          </button>
        </form>
      </div>
    </div>
  )
}
