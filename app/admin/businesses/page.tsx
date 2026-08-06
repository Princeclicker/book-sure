import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtDate } from '@/lib/admin'
import { db } from '@/lib/db'
import { businesses, user, businessMeta, appointments } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { BusinessActions } from '@/components/admin/business-actions'
import { Building2, CalendarDays, DollarSign, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; plan?: string }
}) {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const status = sp.status ?? ''
  const plan = sp.plan ?? ''

  const rows = await db
    .select({
      id: businesses.id,
      businessName: businesses.businessName,
      businessSlug: businesses.businessSlug,
      userId: businesses.userId,
      createdAt: businesses.createdAt,
      ownerEmail: user.email,
      ownerName: user.name,
      ownerVerified: user.emailVerified,
      status: businessMeta.status,
      plan: businessMeta.plan,
      planStatus: businessMeta.planStatus,
      storageBytes: businessMeta.storageBytes,
      aiUsageTokens: businessMeta.aiUsageTokens,
    })
    .from(businesses)
    .leftJoin(user, eq(businesses.userId, user.id))
    .leftJoin(businessMeta, eq(businessMeta.businessId, businesses.id))
    .orderBy(businesses.createdAt)

  const counts = await db
    .select({
      userId: appointments.userId,
      count: sql<number>`count(*)`,
    })
    .from(appointments)
    .groupBy(appointments.userId)

  const countMap = new Map(counts.map((c) => [c.userId, Number(c.count)]))

  const filtered = rows.filter((b) => {
    if (q) {
      const hay = `${b.businessName} ${b.ownerEmail ?? ''} ${b.ownerName ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (status && (b.status ?? 'active') !== status) return false
    if (plan && (b.plan ?? 'free') !== plan) return false
    return true
  })

  const totals = {
    all: rows.length,
    active: rows.filter((b) => (b.status ?? 'active') === 'active').length,
    suspended: rows.filter((b) => b.status === 'suspended').length,
    paid: rows.filter((b) => b.plan !== 'free').length,
    appointments: counts.reduce((sum, c) => sum + Number(c.count), 0),
  }

  return (
    <div>
      <PageHeader
        title="Business Management"
        description="Monitor and manage every business on the platform."
        actions={<Link href="/admin/businesses" className="text-xs text-primary hover:underline">Refresh</Link>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Businesses" value={fmtNum(totals.all)} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Active" value={fmtNum(totals.active)} tone="positive" icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Suspended" value={fmtNum(totals.suspended)} tone={totals.suspended > 0 ? 'warning' : undefined} icon={<Users className="h-4 w-4" />} />
        <StatCard label="On Paid Plans" value={fmtNum(totals.paid)} tone="accent" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="mt-6">
        <Card title={`Businesses (${filtered.length})`}>
          <form method="get" className="flex flex-wrap items-end gap-2 p-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input
                name="q"
                className="mt-1 h-8 w-52 rounded-md border border-border bg-background px-2 text-sm"
                defaultValue={sp.q ?? ''}
                placeholder="Name or owner email"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select name="status" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={status}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plan</label>
              <select name="plan" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={plan}>
                <option value="">All</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Filter</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Appointments</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No businesses found.</td></tr>
                )}
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30 align-top">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{b.businessName}</div>
                      <div className="text-xs text-muted-foreground">/{b.businessSlug}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-foreground">{b.ownerName ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{b.ownerEmail ?? '—'}</div>
                      {!b.ownerVerified && <Badge tone="amber" className="mt-1">unverified</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtNum(countMap.get(b.userId) ?? 0)}</td>
                    <td className="p-3">
                      <Badge tone={statusTone(b.plan ?? 'free')}>{b.plan ?? 'free'}</Badge>
                      {b.planStatus && b.planStatus !== 'active' && (
                        <div className="mt-1"><Badge tone="amber">{b.planStatus}</Badge></div>
                      )}
                    </td>
                    <td className="p-3"><Badge tone={statusTone(b.status ?? 'active')}>{b.status ?? 'active'}</Badge></td>
                    <td className="p-3 text-muted-foreground">{fmtDate(b.createdAt)}</td>
                    <td className="p-3">
                      <BusinessActions
                        businessId={b.id}
                        status={b.status ?? 'active'}
                        plan={b.plan ?? 'free'}
                        planStatus={b.planStatus ?? 'active'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
