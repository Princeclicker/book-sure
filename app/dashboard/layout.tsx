import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { businesses, businessProfiles } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/top-bar'
import type { ProfessionId } from '@/lib/profession'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id

  const [business, profile] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1).then(r => r[0] || null),
    db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null),
  ])

  const profession = (profile?.profession as ProfessionId) || 'freelancer'

  if (profile && !profile.onboardingCompleted) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profession={profession}
        businessName={business?.businessName}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={session.user.name || ''} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
