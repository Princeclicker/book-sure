import { redirect } from 'next/navigation'
import { sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtCurrency, fmtDateTime } from '@/lib/admin'
import { db } from '@/lib/db'
import { invoices, payments, invoiceItems } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { DollarSign, CreditCard, Clock, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminFinancePage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [invoiceRows, paymentRows] = await Promise.all([
    db.select().from(invoices),
    db.select().from(payments).orderBy(sql`${payments.paidAt} desc`).limit(30),
  ])

  const statusCount = new Map<string, number>()
  for (const i of invoiceRows) statusCount.set(i.status ?? 'draft', (statusCount.get(i.status ?? 'draft') ?? 0) + 1)

  const totalInvoiced = invoiceRows.reduce((s, i) => s + Number(i.total ?? 0), 0)
  const totalCollected = paymentRows.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const totalOutstanding = Math.max(totalInvoiced - totalCollected, 0)

  const methodCount = new Map<string, number>()
  for (const p of paymentRows) methodCount.set(p.paymentMethod ?? 'manual', (methodCount.get(p.paymentMethod ?? 'manual') ?? 0) + 1)

  return (
    <div>
      <PageHeader title="Financial Analytics" description="Invoicing and payments across all businesses." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Invoiced" value={fmtCurrency(totalInvoiced)} tone="accent" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Collected" value={fmtCurrency(totalCollected)} tone="positive" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Outstanding" value={fmtCurrency(totalOutstanding)} tone={totalOutstanding > 0 ? 'warning' : undefined} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Invoices" value={fmtNum(invoiceRows.length)} icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Invoices by Status">
          <div className="divide-y divide-border">
            {statusCount.size === 0 && <p className="p-4 text-sm text-muted-foreground">No invoices yet.</p>}
            {[...statusCount.entries()].map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{status}</span>
                <Badge tone={statusTone(status)}>{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Payments by Method (recent)">
          <div className="divide-y divide-border">
            {methodCount.size === 0 && <p className="p-4 text-sm text-muted-foreground">No payments yet.</p>}
            {[...methodCount.entries()].map(([method, count]) => (
              <div key={method} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{method}</span>
                <Badge tone="blue">{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Recent Payments">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Invoice</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Paid</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No payments recorded yet.</td></tr>
                )}
                {paymentRows.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">#{p.invoiceId}</td>
                    <td className="p-3 font-medium text-foreground">{fmtCurrency(p.amount)}</td>
                    <td className="p-3"><Badge tone="blue">{p.paymentMethod ?? 'manual'}</Badge></td>
                    <td className="p-3 text-muted-foreground">{p.reference ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{fmtDateTime(p.paidAt)}</td>
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
