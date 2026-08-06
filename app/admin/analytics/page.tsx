import { redirect } from 'next/navigation'
import { sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtCurrency } from '@/lib/admin'
import { getPlatformMetrics } from '@/lib/admin-metrics'
import { db } from '@/lib/db'
import { contacts, opportunities } from '@/lib/db/tables'
import { PageHeader, Card } from '@/components/admin/page'
import { BarChart, LineChart, Donut } from '@/components/admin/charts'
import { Badge, statusTone } from '@/components/admin/badge'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [m, contactRows, oppRows] = await Promise.all([
    getPlatformMetrics(),
    db.select().from(contacts),
    db.select().from(opportunities),
  ])

  const sourceCount = new Map<string, number>()
  for (const c of contactRows) sourceCount.set(c.source ?? 'manual', (sourceCount.get(c.source ?? 'manual') ?? 0) + 1)

  const stageTotal = new Map<string, number>()
  for (const o of oppRows) {
    const stage = o.stage ?? 'lead'
    stageTotal.set(stage, (stageTotal.get(stage) ?? 0) + Number(o.value ?? 0))
  }

  const totals = m.totals

  return (
    <div>
      <PageHeader title="Analytics" description="Deep-dive platform analytics and trends." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Business Growth">
          <div className="p-4"><BarChart data={m.charts.businessGrowth} /></div>
        </Card>
        <Card title="User Growth">
          <div className="p-4"><BarChart data={m.charts.userGrowth} /></div>
        </Card>
        <Card title="Appointment Trends">
          <div className="p-4"><LineChart data={m.charts.appointmentTrends} /></div>
        </Card>
        <Card title="Revenue Trends">
          <div className="p-4"><LineChart data={m.charts.revenueTrends} /></div>
        </Card>
        <Card title="AI Usage">
          <div className="p-4"><BarChart data={m.charts.aiUsage} /></div>
        </Card>
        <Card title="Appointment Status Distribution">
          <div className="p-4">
            {m.charts.appointmentStatus.length ? <Donut segments={m.charts.appointmentStatus} /> : <p className="text-sm text-muted-foreground">No data yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Contacts by Source">
          <div className="divide-y divide-border">
            {sourceCount.size === 0 && <p className="p-4 text-sm text-muted-foreground">No contacts yet.</p>}
            {[...sourceCount.entries()].map(([src, count]) => (
              <div key={src} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{src}</span>
                <Badge tone="blue">{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Pipeline Value by Stage">
          <div className="divide-y divide-border">
            {stageTotal.size === 0 && <p className="p-4 text-sm text-muted-foreground">No opportunities yet.</p>}
            {[...stageTotal.entries()].map(([stage, value]) => (
              <div key={stage} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{stage}</span>
                <Badge tone={statusTone(stage)}>{fmtCurrency(value)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Top Businesses">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Appointments</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Plan</th>
                </tr>
              </thead>
              <tbody>
                {m.topBusinesses.map((b) => (
                  <tr key={b.name} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{b.name}</td>
                    <td className="p-3 text-muted-foreground">{b.ownerEmail}</td>
                    <td className="p-3 text-muted-foreground">{fmtNum(b.appointments)}</td>
                    <td className="p-3"><Badge tone={statusTone(b.plan)}>{b.plan}</Badge></td>
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
