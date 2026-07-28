import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { BrandingCustomizer } from '@/components/branding-customizer'
import { ArrowLeft } from 'lucide-react'

export default async function BrandingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, session.user.id))
    .limit(1)
    .then(r => r[0] || null)

  if (!business) redirect('/settings')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-1">Branding</h1>
        <p className="text-sm text-muted-foreground mb-8">Customize your public booking page</p>
        <div className="rounded-xl border border-border bg-card p-6">
          <BrandingCustomizer
            initialBrandColor={business.brandColor || '#3b82f6'}
            initialLogoUrl={business.logoUrl || ''}
          />
        </div>
      </div>
    </div>
  )
}
