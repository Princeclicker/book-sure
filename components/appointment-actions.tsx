'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

export function AppointmentActions({ appointmentId }: { appointmentId: number }) {
  const [isCancelling, setIsCancelling] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this appointment? The customer will be notified via SMS.')) return

    setIsCancelling(true)
    try {
      const res = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      })

      if (!res.ok) throw new Error('Failed to cancel')

      router.refresh()
    } catch (e) {
      alert('Failed to cancel appointment. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400 px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
    >
      <XCircle className="w-3 h-3" />
      {isCancelling ? 'Cancelling...' : 'Cancel'}
    </button>
  )
}
