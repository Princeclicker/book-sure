'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity } from 'lucide-react'

export function LiveRefresh() {
  const router = useRouter()
  const [updatedAt, setUpdatedAt] = useState<string>(
    () => new Date().toLocaleTimeString('en-US', { hour12: false })
  )

  useEffect(() => {
    const id = setInterval(() => {
      setUpdatedAt(new Date().toLocaleTimeString('en-US', { hour12: false }))
      router.refresh()
    }, 30000)
    return () => clearInterval(id)
  }, [router])

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600"
      title="This page auto-refreshes every 30 seconds with the latest data from the database."
    >
      <Activity className="h-3 w-3" />
      Live · refreshed {updatedAt}
    </div>
  )
}
