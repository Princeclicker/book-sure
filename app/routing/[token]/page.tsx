'use client'

import { useState, useEffect } from 'react'
import { getFormByToken, submitForm } from '@/app/actions/routing-forms'
import { Loader2, CheckCircle2, Send } from 'lucide-react'

interface FormData {
  id: number; title: string; fields: { label: string; type: string; required: boolean }[]
  redirectUrl: string | null; isActive: boolean | null
}

export default function RoutingFormPage({ params }: { params: Promise<{ token: string }> }) {
  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadForm()
  }, [])

  async function loadForm() {
    const { token } = await params
    const f = await getFormByToken(token)
    if (!f) { setError('Form not found'); setLoading(false); return }
    setForm(f as any)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { token } = await params
      const redirectUrl = await submitForm(token, values)
      setSuccess(true)
      if (redirectUrl) {
        setTimeout(() => { window.location.href = redirectUrl }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (error && !form) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <p className="text-muted-foreground">{error}</p>
    </div>
  )

  if (!form) return null

  if (success) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-green-900 mb-2">Submitted!</h2>
        <p className="text-sm text-green-800">Thank you. We&apos;ll be in touch soon.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="text-center mb-8">
          <Send className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          {form.fields.map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea required={field.required} value={values[field.label] || ''}
                  onChange={e => setValues({ ...values, [field.label]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" rows={3} />
              ) : (
                <input type={field.type} required={field.required} value={values[field.label] || ''}
                  onChange={e => setValues({ ...values, [field.label]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
              )}
            </div>
          ))}

          <button type="submit" disabled={submitting}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}
