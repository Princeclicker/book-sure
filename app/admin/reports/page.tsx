import { redirect } from 'next/navigation'
import { getAdminUser, fmtNum, fmtCurrency, fmtBytes } from '@/lib/admin'
import { getPlatformMetrics } from '@/lib/admin-metrics'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/tables'
import { PageHeader, Card } from '@/components/admin/page'
import { Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const m = await getPlatformMetrics()
  const t = m.totals

  const businessesList = await db
    .select({ id: businesses.id, businessName: businesses.businessName, userId: businesses.userId, createdAt: businesses.createdAt })
    .from(businesses)

  return (
    <div>
      <PageHeader title="Reports" description="Operational reports for the platform." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="Platform snapshot" rows={[
          ['Businesses', fmtNum(t.businesses)],
          ['Users', fmtNum(t.users)],
          ['Appointments', fmtNum(t.appointments)],
          ['Contacts', fmtNum(t.contacts)],
          ['Revenue', fmtCurrency(t.revenue)],
        ]} />
        <ReportCard label="AI usage" rows={[
          ['AI insights', fmtNum(t.aiInsights)],
          ['Tokens consumed', fmtNum(t.aiTokens)],
          ['Storage (tracked)', fmtBytes(t.storageBytes)],
          ['API calls', fmtNum(t.apiCalls)],
        ]} />
        <ReportCard label="Billing" rows={[
          ['Invoices', fmtNum(t.invoices)],
          ['Paid invoices', fmtNum(t.paidInvoices)],
          ['Active businesses', fmtNum(t.activeBusinesses)],
        ]} />
        <ReportCard label="Engagement" rows={[
          ['Active users today', fmtNum(t.activeUsersToday)],
          ['Active sessions', fmtNum(t.sessions)],
          ['Opportunities', fmtNum(t.opportunities)],
        ]} />
      </div>

      <div className="mt-6">
        <Card title="Business Directory">
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-sm text-muted-foreground">{businessesList.length} registered businesses</p>
            <a
              href="/api/admin/audit-logs"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Export audit log (CSV)
            </a>
          </div>
          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Owner user id</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {businessesList.map((b, i) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">{b.businessName}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{b.userId}</td>
                    <td className="p-3 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</td>
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

function ReportCard({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <Card title={label}>
      <div className="p-4">
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
