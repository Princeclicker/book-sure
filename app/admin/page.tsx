import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminUser, fmtNum, fmtCurrency, fmtBytes } from '@/lib/admin'
import { getPlatformMetrics } from '@/lib/admin-metrics'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { Card, PageHeader } from '@/components/admin/page'
import { BarChart, LineChart, Donut } from '@/components/admin/charts'
import {
  Building2, Users, CalendarDays, Contact, Target, FileText, DollarSign,
  Brain, Database, Activity, HeartPulse, Bell,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const m = await getPlatformMetrics()
  const t = m.totals

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description={`Welcome back, ${admin.user.name}. Overview of the entire BookSure platform.`}
      />

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Businesses" value={fmtNum(t.businesses)} sub={`${fmtNum(t.activeBusinesses)} active`} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Total Users" value={fmtNum(t.users)} sub={`${fmtNum(t.activeUsersToday)} active today`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Appointments" value={fmtNum(t.appointments)} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Contacts" value={fmtNum(t.contacts)} icon={<Contact className="h-4 w-4" />} />
        <StatCard label="Opportunities" value={fmtNum(t.opportunities)} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Invoices" value={fmtNum(t.invoices)} sub={`${fmtNum(t.paidInvoices)} paid`} icon={<FileText className="h-4 w-4" />} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Platform Revenue" value={fmtCurrency(t.revenue)} tone="positive" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="AI Insights" value={fmtNum(t.aiInsights)} sub={`${fmtNum(t.aiTokens)} tokens`} tone="accent" icon={<Brain className="h-4 w-4" />} />
        <StatCard label="Storage Usage" value={fmtBytes(t.storageBytes)} icon={<Database className="h-4 w-4" />} />
        <StatCard label="API Calls (tracked)" value={fmtNum(t.apiCalls)} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Active Sessions" value={fmtNum(t.sessions)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="System Health" value={`${m.health.filter(h => h.ok).length}/${m.health.length} OK`} tone={m.health.every(h => h.ok) ? 'positive' : 'warning'} icon={<HeartPulse className="h-4 w-4" />} />
      </div>

      {/* Charts row 1 */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Business Growth" description="New businesses per month">
          <div className="p-4"><BarChart data={m.charts.businessGrowth} /></div>
        </Card>
        <Card title="User Growth" description="New users per month">
          <div className="p-4"><BarChart data={m.charts.userGrowth} /></div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Appointment Trends" description="Appointments per month">
          <div className="p-4"><LineChart data={m.charts.appointmentTrends} /></div>
        </Card>
        <Card title="Revenue Trends" description="Payments per month">
          <div className="p-4"><LineChart data={m.charts.revenueTrends} /></div>
        </Card>
      </div>

      {/* AI + Storage */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="AI Usage" description="AI insights generated per month">
          <div className="p-4"><BarChart data={m.charts.aiUsage} /></div>
        </Card>
        <Card title="Storage Usage" description="Tracked storage by business">
          {m.charts.storageByBusiness.length ? (
            <div className="p-4"><BarChart data={m.charts.storageByBusiness} /></div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No storage data yet.</p>
          )}
        </Card>
      </div>

      {/* Appointment status + notifications */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Appointment Status">
          <div className="p-4">
            {m.charts.appointmentStatus.length ? (
              <Donut segments={m.charts.appointmentStatus} />
            ) : (
              <p className="text-sm text-muted-foreground">No appointment data yet.</p>
            )}
          </div>
        </Card>

        <Card
          title="Platform Notifications"
          actions={<Link href="/admin/notifications" className="text-xs text-primary hover:underline">View all</Link>}
        >
          {m.notifications.length ? (
            <div className="divide-y divide-border">
              {m.notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${
                    n.severity === 'danger' ? 'text-red-500' : n.severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.message && <p className="truncate text-xs text-muted-foreground">{n.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">All clear — no notifications.</p>
          )}
        </Card>
      </div>

      {/* Recent activity + health */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Recent Activity" description="Latest platform events">
          {m.recentActivity.length ? (
            <div className="divide-y divide-border">
              {m.recentActivity.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="truncate text-sm text-foreground">{a.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.at}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No recent activity.</p>
          )}
        </Card>

        <Card title="System Health" description="Live platform services">
          <div className="divide-y divide-border">
            {m.health.map((h) => (
              <div key={h.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-foreground">{h.label}</span>
                <span className="flex items-center gap-2 text-xs">
                  <Badge tone={h.ok ? 'green' : 'red'}>{h.ok ? 'Operational' : 'Attention'}</Badge>
                  <span className="text-muted-foreground">{h.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top businesses */}
      <div className="mt-4">
        <Card title="Top Performing Businesses" description="Ranked by appointment volume">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Owner</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Appointments</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {m.topBusinesses.map((b, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{b.name}</td>
                    <td className="p-3 text-muted-foreground">{b.ownerEmail}</td>
                    <td className="p-3 text-muted-foreground">{fmtNum(b.appointments)}</td>
                    <td className="p-3"><Badge tone={statusTone(b.plan)}>{b.plan}</Badge></td>
                    <td className="p-3"><Badge tone={statusTone(b.status)}>{b.status}</Badge></td>
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
