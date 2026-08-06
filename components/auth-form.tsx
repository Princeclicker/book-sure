'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const validate = (): string | null => {
    const cleanEmail = email.trim().toLowerCase()
    if (isSignUp) {
      if (!name.trim()) return 'Please enter your name'
      if (name.trim().length < 2) return 'Name must be at least 2 characters'
      if (name.trim().length > 50) return 'Name must be 50 characters or fewer'
    }
    if (!cleanEmail) return 'Please enter your email'
    if (!EMAIL_REGEX.test(cleanEmail)) return 'Please enter a valid email address'
    if (!password) return 'Please enter your password'
    if (isSignUp && password.length < 8) return 'Password must be at least 8 characters'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVerificationRequired(false)
    setResendSent(false)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const { data, error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      const message =
        (typeof error === 'object' && error?.message) || 'Something went wrong'
      const code = typeof error === 'object' ? error?.code : undefined
      if (
        code === 'EMAIL_NOT_VERIFIED' ||
        (typeof error === 'string' && /not verified/i.test(error)) ||
        /not verified/i.test(message)
      ) {
        setVerificationRequired(true)
        setError(null)
        return
      }
      setError(message)
      return
    }

    if (isSignUp && !data?.token) {
      setVerificationRequired(true)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleResend = async () => {
    setError(null)
    setResendSent(false)
    const res = await authClient.sendVerificationEmail({ email, callbackURL: '/' })
    if (res.error) {
      setError('Could not send the verification email. Please try again.')
      return
    }
    setResendSent(true)
  }

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp
              ? 'Sign up to get started'
              : 'Sign in to your account to continue'}
          </p>
        </div>

        {verificationRequired ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              {isSignUp
                ? 'Your account has been created. We sent a confirmation link to '
                : 'Your email address has not been verified yet. We sent a confirmation link to '}
              <span className="font-medium">{email}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your inbox and click the link to verify your email. If you
              don't see it, check your spam folder.
            </p>
            {resendSent ? (
              <p className="text-sm text-muted-foreground">
                A new confirmation link is on its way.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
              >
                Resend confirmation email
              </Button>
            )}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="text-sm text-muted-foreground text-center hover:text-foreground"
            >
              {isSignUp ? 'Go to sign in' : 'Back to sign up'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 8 : undefined}
                maxLength={128}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? 'Please wait...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>
        )}

        {!verificationRequired && (
          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        )}
      </Card>
    </main>
  )
}
