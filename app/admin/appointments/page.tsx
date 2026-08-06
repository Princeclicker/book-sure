import { redirect } from 'next/navigation'
import { eq, sql, and, gte, lte, like, or } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtDateTime, timeAgo } from '@/lib/admin'
import { db } from '@/lib/db'
import { appointments, businesses, user } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { CalendarDays, CalendarClock, XCircle, CalendarCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUSES = ['confirmed', 'pending', 'cancelled', 'completed', 'no-show', 'rescheduled']

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; from?: string; to?: string }
}) {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const status = sp.status ?? ''
  const from = sp.from
  const to = sp.to

  const conditions = []
  if (q) conditions.push(or(like(appointments.customerName, `%${q}%`), like(appointments.customerEmail, `%${q}%`))!)
  if (status) conditions.push(eq(appointments.status, status))
  if (from) conditions.push(gte(appointments.eventStart, new Date(`${from}T00:00:00`)))
  if (to) conditions.push(lte(appointments.eventStart, new Date(`${to}T23:59:59`)))

  const rows = await db
    .select({
      id: appointments.id,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      eventStart: appointments.eventStart,
      eventEnd: appointments.eventEnd,
      status: appointments.status,
      duration: appointments.duration,
      createdAt: appointments.createdAt,
      reminderSent: appointments.reminderSent,
      userId: appointments.userId,
      businessName: businesses.businessName,
    })
    .from(appointments)
    .leftJoin(businesses, eq(businesses.userId, appointments.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${appointments.eventStart} desc`)
    .limit(500)

  const all = await db.select({ status: appointments.status, eventStart: appointments.eventStart }).from(appointments)
  const now = new Date()
  const totals = {
    total: all.length,
    today: all.filter((a) => {
      const d = new Date(a.eventStart)
      return d.toDateString() === now.toDateString()
    }).length,
    upcoming: all.filter((a) => new Date(a.eventStart) >= now).length,
    cancelled: all.filter((a) => a.status === 'cancelled').length,
  }

  return (
    <div>
      <PageHeader
        title="Appointment Monitoring"
        description="All appointments across every business. Read-only — use Impersonation to act on a business."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Appointments" value={fmtNum(totals.total)} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Today" value={fmtNum(totals.today)} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Upcoming" value={fmtNum(totals.upcoming)} tone="positive" icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard label="Cancelled" value={fmtNum(totals.cancelled)} tone={totals.cancelled > 0 ? 'warning' : undefined} icon={<XCircle className="h-4 w-4" />} />
      </div>

      <div className="mt-6">
        <Card title={`Appointments (showing ${rows.length})`}>
          <form method="get" className="flex flex-wrap items-end gap-2 p-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search customer</label>
              <input name="q" className="mt-1 h-8 w-48 rounded-md border border-border bg-background px-2 text-sm" defaultValue={sp.q ?? ''} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select name="status" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={status}>
                <option value="">All</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <input type="date" name="from" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={from} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <input type="date" name="to" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={to} />
            </div>
            <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Filter</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Start</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Duration</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Reminder</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No appointments found.</td></tr>
                )}
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{a.customerName}</div>
                      <div className="text-xs text-muted-foreground">{a.customerEmail}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.businessName ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{fmtDateTime(a.eventStart)}</td>
                    <td className="p-3 text-muted-foreground">{a.duration}m</td>
                    <td className="p-3"><Badge tone={statusTone(a.status ?? 'confirmed')}>{a.status ?? 'confirmed'}</Badge></td>
                    <td className="p-3 text-muted-foreground">{a.reminderSent ? 'Sent' : '—'}</td>
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
