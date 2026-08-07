'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const ENGINES = [
  { value: 'rules', label: 'Local rules engine (no API key needed)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
]

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
]

export function AiEngineConfig({
  engine,
  replyTone,
}: {
  engine: string
  replyTone: string
}) {
  const router = useRouter()
  const [aiEngine, setAiEngine] = useState(engine)
  const [tone, setTone] = useState(replyTone)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: { aiEngine, aiReplyTone: tone } }),
      })
      const r = await res.json()
      if (r.error) setError(r.error)
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="divide-y divide-border">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">AI engine</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Which engine powers AI-generated insights and replies. &apos;rules&apos; runs fully locally.
          </p>
        </div>
        <select
          className="h-8 w-72 max-w-full rounded-md border border-border bg-background px-2 text-sm"
          value={aiEngine}
          onChange={(e) => setAiEngine(e.target.value)}
        >
          {ENGINES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Default AI reply tone</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tone used for auto-generated replies and messages.
          </p>
        </div>
        <select
          className="h-8 w-72 max-w-full rounded-md border border-border bg-background px-2 text-sm"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          {TONES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 p-4">
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save engine settings'}</Button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
