'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (!token) {
      // Guard for missing query param (cannot be derived from state).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error')
      setError('This verification link is missing its token. Please request a new one.')
      return
    }
    if (ran.current) return
    ran.current = true

    ;(async () => {
      const res = await authClient.verifyEmail({ query: { token } })
      if (res.error) {
        setStatus('error')
        setError(
          (typeof res.error === 'object' && res.error?.message) ||
            'This verification link is invalid or has expired. Please request a new one.'
        )
        return
      }
      setStatus('success')
      window.setTimeout(() => {
        router.replace('/dashboard')
        router.refresh()
      }, 1500)
    })()
  }, [token, router])

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Verifying your email…
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Email verified
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your email has been confirmed. Redirecting you to your dashboard…
            </p>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
            >
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
              Couldn&apos;t verify your email
            </h1>
            <p className="text-sm text-destructive mb-6">{error}</p>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              Go to sign in
            </Link>
          </>
        )}
      </Card>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
