'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function DisconnectCalendar() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleDisconnect() {
    setLoading(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/calendar/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setStatus('success')
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <p className="text-sm text-green-600 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4" /> Disconnected! Refreshing...
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
        {loading ? 'Disconnecting...' : 'Disconnect'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-600">Failed to disconnect. Please try again.</p>
      )}
    </div>
  )
}
