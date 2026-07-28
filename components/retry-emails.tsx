'use client'

import { useEffect } from 'react'

export function RetryEmails() {
  useEffect(() => {
    fetch('/api/admin/retry-emails', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
