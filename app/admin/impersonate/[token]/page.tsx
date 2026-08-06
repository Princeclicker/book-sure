import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq, desc } from 'drizzle-orm'
import { getAdminUser, verifyImpersonationToken, fmtDateTime, fmtNum, fmtDate } from '@/lib/admin'
import { db } from '@/lib/db'
import { businesses, appointments, contacts, aiInsights, businessMeta } from '@/lib/db/tables'
import { Badge, statusTone } from '@/components/admin/badge'
import { Card } from '@/components/admin/page'
import { Eye, ArrowLeft, CalendarDays, Contact, Brain } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminImpersonatePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const admin = await getAdminUser()
  if (!admin) return notFound()

  const { token } = await params
  const data = verifyImpersonationToken(token)
  if (!data) return notFound()

  const [business, apptRows, contactRows, insightRows, meta] = await Promise.all([
    db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, data.userId))
      .limit(1)
      .then((r) => r[0] || null),
    db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, data.userId))
      .orderBy(desc(appointments.eventStart))
      .limit(10),
    db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, data.userId))
      .limit(10),
    db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.userId, data.userId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(10),
    db
      .select()
      .from(businessMeta)
      .where(eq(businessMeta.businessId, data.businessId))
      .limit(1)
      .then((r) => r[0] || null),
  ])

  const title = business?.businessName ?? 'Business workspace'

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 mb-4 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-3 dark:bg-amber-950/40">
        <span className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          <Eye className="h-4 w-4" /> Impersonating read-only view of &quot;{title}&quot;
        </span>
        <Link
          href="/admin/businesses"
          className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Stop impersonation
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-card p-5">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>/{(business as any)?.businessSlug ?? '—'}</span>
          <span>·</span>
          <span>Created {business ? fmtDate(business.createdAt) : '—'}</span>
          <span>·</span>
          <Badge tone={statusTone(meta?.status ?? 'active')}>{meta?.status ?? 'active'}</Badge>
          <Badge tone={statusTone(meta?.plan ?? 'free')}>{meta?.plan ?? 'free'}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent Appointments">
          <div className="divide-y divide-border">
            {apptRows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No appointments.</p>}
            {apptRows.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{a.customerName}</p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.eventStart)}</p>
                </div>
                <Badge tone={statusTone(a.status ?? 'confirmed')}>{a.status ?? 'confirmed'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Contacts">
          <div className="divide-y divide-border">
            {contactRows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No contacts.</p>}
            {contactRows.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.email || c.phone || '—'}</p>
                </div>
                <Badge tone={statusTone(c.status ?? 'lead')}>{c.status ?? 'lead'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI Insights">
          <div className="divide-y divide-border">
            {insightRows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No AI insights.</p>}
            {insightRows.map((i) => (
              <div key={i.id} className="px-4 py-2.5">
                <p className="text-sm font-medium text-foreground">{i.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{i.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
