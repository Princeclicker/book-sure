'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, BarChart3, Loader2, CalendarDays, Clock, Copy, CheckCircle2 } from 'lucide-react'
import { getPolls, createPoll, closePoll, deletePoll } from '@/app/actions/polls'

interface Poll {
  id: number; title: string; description: string | null; duration: number | null
  proposedDates: string[]; timeStart: number | null; timeEnd: number | null
  status: string | null; shareToken: string | null; createdAt: Date
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', duration: 30,
    dates: [''],
    timeStart: 9, timeEnd: 17,
  })

  useEffect(() => { loadPolls() }, [])

  async function loadPolls() {
    setLoading(true)
    const p = await getPolls()
    setPolls(p as any)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createPoll({
        title: form.title,
        description: form.description || undefined,
        duration: form.duration,
        proposedDates: form.dates.filter(d => d.trim()),
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
      })
      setShowCreate(false)
      setForm({ title: '', description: '', duration: 30, dates: [''], timeStart: 9, timeEnd: 17 })
      await loadPolls()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create poll') }
  }

  function addDateField() { setForm({ ...form, dates: [...form.dates, ''] }) }

  function removeDateField(i: number) {
    setForm({ ...form, dates: form.dates.filter((_, idx) => idx !== i) })
  }

  function copyLink(token: string, id: number) {
    const url = `${window.location.origin}/poll/${token}`
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
              <BarChart3 className="w-5 h-5" /> Meeting Polls
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Quickly find the best meeting times for your group.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="w-4 h-4" /> Create Poll
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200">{error}</div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">New Meeting Poll</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Title</label>
              <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Team Standup" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Duration (min)</label>
                <input type="number" min={5} max={180} value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Time Start</label>
                <input type="number" min={0} max={23} value={form.timeStart} onChange={e => setForm({ ...form, timeStart: parseInt(e.target.value) || 9 })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Time End</label>
                <input type="number" min={0} max={23} value={form.timeEnd} onChange={e => setForm({ ...form, timeEnd: parseInt(e.target.value) || 17 })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Proposed Dates</label>
              <div className="space-y-2">
                {form.dates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="date" required value={d} onChange={e => {
                      const newDates = [...form.dates]
                      newDates[i] = e.target.value
                      setForm({ ...form, dates: newDates })
                    }} className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                    {form.dates.length > 1 && (
                      <button type="button" onClick={() => removeDateField(i)} className="p-2 text-muted-foreground hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addDateField} className="mt-2 text-sm text-primary hover:underline cursor-pointer">+ Add another date</button>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Poll</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        {polls.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Polls Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a meeting poll to find the best time for your group.</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create Poll</button>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map(poll => (
              <div key={poll.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{poll.title}</h3>
                    {poll.description && <p className="text-xs text-muted-foreground mt-1">{poll.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {poll.proposedDates?.length || 0} dates</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {poll.duration}min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      poll.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      'bg-muted text-muted-foreground'
                    }`}>{poll.status}</span>
                    {poll.shareToken && (
                      <button onClick={() => copyLink(poll.shareToken!, poll.id)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer" title="Copy poll link">
                        {copiedId === poll.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    {poll.status === 'open' && (
                      <button onClick={async () => { await closePoll(poll.id); await loadPolls() }} className="px-2 py-1 text-xs border border-border rounded-md hover:bg-muted cursor-pointer">Close</button>
                    )}
                    <button onClick={async () => { await deletePoll(poll.id); await loadPolls() }} className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer">
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
