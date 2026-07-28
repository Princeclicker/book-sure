'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LegacyClientDashboardRedirect() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  useEffect(() => {
    const token = slug
    if (!token) return

    fetch(`/api/client-appointments/resolve-token?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.businessSlug) {
          router.replace(`/client/dashboard/${data.businessSlug}/${token}`)
        } else {
          router.replace('/client/dashboard')
        }
      })
      .catch(() => {
        router.replace('/client/dashboard')
      })
  }, [slug, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}
