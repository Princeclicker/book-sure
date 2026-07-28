'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ConnectCalendarPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnectGoogle = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/google/url')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate Google connection')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate connection')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Connect Your Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Sync with Google Calendar to manage availability and prevent double bookings
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-2">Google Calendar</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              BookSure will be able to read your availability and create events for new bookings
            </p>

            <ul className="text-left max-w-xs mx-auto space-y-2 mb-6">
              {['Check your available time slots', 'Create events for new bookings', 'Prevent double bookings', 'Sync working hours'].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-left">
                <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-input rounded-lg text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Connecting...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect with Google
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground mt-4">
              You&apos;ll be redirected to Google to authorize access
            </p>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-50 mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Setup Required
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
            You need to configure Google OAuth credentials in your environment variables:
          </p>
          <code className="block text-xs bg-black/10 dark:bg-white/10 px-3 py-2 rounded-lg mb-2 font-mono">
            GOOGLE_CLIENT_ID=your-client-id
            <br />
            GOOGLE_CLIENT_SECRET=your-client-secret
          </code>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Redirect URI:{' '}
            <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">
              {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
