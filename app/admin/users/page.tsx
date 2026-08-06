import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtDate, fmtDateTime } from '@/lib/admin'
import { db } from '@/lib/db'
import { user, businesses, session } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { UserActions } from '@/components/admin/user-actions'
import { Users, ShieldCheck, ShieldX, UserCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string }
}) {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const role = sp.role ?? ''
  const status = sp.status ?? ''

  const rows = await db.select().from(user).orderBy(user.createdAt)

  const bizCounts = await db
    .select({ userId: businesses.userId, count: sql<number>`count(*)` })
    .from(businesses)
    .groupBy(businesses.userId)
  const bizMap = new Map(bizCounts.map((c) => [c.userId, Number(c.count)]))

  const sessionRows = await db
    .select({ userId: session.userId, createdAt: session.createdAt })
    .from(session)
  const lastSeen = new Map<string, Date>()
  for (const s of sessionRows) {
    const cur = lastSeen.get(s.userId)
    if (!cur || new Date(s.createdAt) > cur) lastSeen.set(s.userId, new Date(s.createdAt))
  }

  const filtered = rows.filter((u) => {
    if (q) {
      const hay = `${u.name} ${u.email}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (role && (u.role ?? 'user') !== role) return false
    if (status === 'suspended' && !u.suspended) return false
    if (status === 'active' && u.suspended) return false
    return true
  })

  const totals = {
    all: rows.length,
    admins: rows.filter((u) => u.role === 'admin').length,
    suspended: rows.filter((u) => u.suspended).length,
    unverified: rows.filter((u) => !u.emailVerified).length,
  }

  return (
    <div>
      <PageHeader title="User Management" description="Manage every user account on the platform." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={fmtNum(totals.all)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Admins" value={fmtNum(totals.admins)} tone="accent" icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Suspended" value={fmtNum(totals.suspended)} tone={totals.suspended > 0 ? 'warning' : undefined} icon={<ShieldX className="h-4 w-4" />} />
        <StatCard label="Unverified Emails" value={fmtNum(totals.unverified)} tone={totals.unverified > 0 ? 'warning' : undefined} icon={<UserCheck className="h-4 w-4" />} />
      </div>

      <div className="mt-6">
        <Card title={`Users (${filtered.length})`}>
          <form method="get" className="flex flex-wrap items-end gap-2 p-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input name="q" className="mt-1 h-8 w-52 rounded-md border border-border bg-background px-2 text-sm" defaultValue={sp.q ?? ''} placeholder="Name or email" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select name="role" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={role}>
                <option value="">All</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select name="status" className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm" defaultValue={status}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Filter</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Businesses</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Last seen</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 align-top">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3"><Badge tone={u.role === 'admin' ? 'purple' : 'blue'}>{u.role ?? 'user'}</Badge></td>
                    <td className="p-3 text-muted-foreground">{fmtNum(bizMap.get(u.id) ?? 0)}</td>
                    <td className="p-3 text-muted-foreground">{lastSeen.has(u.id) ? fmtDateTime(lastSeen.get(u.id)) : 'never'}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(u.createdAt)}</td>
                    <td className="p-3 space-y-1">
                      <Badge tone={u.suspended ? 'red' : 'green'}>{u.suspended ? 'Suspended' : 'Active'}</Badge>
                      {!u.emailVerified && <div><Badge tone="amber">unverified</Badge></div>}
                    </td>
                    <td className="p-3">
                      <UserActions
                        userId={u.id}
                        email={u.email}
                        suspended={u.suspended}
                        emailVerified={u.emailVerified}
                        role={u.role ?? 'user'}
                        isSelf={u.email === admin.user.email}
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
