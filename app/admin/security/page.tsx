import { redirect } from 'next/navigation'
import { getAdminUser, adminEmails } from '@/lib/admin'
import { db } from '@/lib/db'
import { session, user, businesses } from '@/lib/db/tables'
import { PageHeader, Card } from '@/components/admin/page'
import { Badge, statusTone } from '@/components/admin/badge'
import { ShieldCheck, KeyRound, Mail, Users, Monitor } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [sessions, users, businessesRows] = await Promise.all([
    db.select().from(session),
    db.select().from(user),
    db.select().from(businesses),
  ])

  const emails = adminEmails()
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const adminUsers = users.filter((u) => u.role === 'admin')
  const suspendedUsers = users.filter((u) => u.suspended)

  const checks = [
    { label: 'Admin role users', ok: adminUsers.length > 0, detail: `${adminUsers.length} account(s) with admin role` },
    { label: 'ADMIN_EMAILS overrides', ok: emails.length > 0, detail: emails.join(', ') || 'none set' },
    { label: 'SMTP configured', ok: smtpConfigured, detail: smtpConfigured ? `${process.env.SMTP_HOST}` : 'not configured' },
    { label: 'Google OAuth configured', ok: googleConfigured, detail: googleConfigured ? 'client id present' : 'not configured' },
    { label: 'Suspended accounts', ok: suspendedUsers.length === 0, detail: `${suspendedUsers.length} suspended` },
    { label: 'Active sessions', ok: sessions.length > 0, detail: `${sessions.length} active session(s)` },
  ]

  return (
    <div>
      <PageHeader title="Security Center" description="Platform security posture, admins and sessions." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Security checks">
          <div className="divide-y divide-border">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
                <Badge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'Pass' : 'Review'}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Platform admins">
          <div className="divide-y divide-border">
            {adminUsers.length === 0 && <p className="p-4 text-sm text-muted-foreground">No admin-role users.</p>}
            {adminUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-purple-500" />
              </div>
            ))}
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">Also granted by ADMIN_EMAILS env var: {emails.join(', ') || 'none'}</p>
            </div>
          </div>
        </Card>

        <Card title="Recommendations">
          <div className="p-4 space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /> Admin passwords are hashed with scrypt. Reset them from the Users page when in doubt.</p>
            <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> Verify user emails before granting admin role.</p>
            <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0" /> Suspended users cannot sign in again until reactivated.</p>
            <p className="flex items-start gap-2"><Monitor className="mt-0.5 h-4 w-4 shrink-0" /> {sessions.length} session(s) currently active across the platform.</p>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Businesses summary">
          <div className="flex flex-wrap gap-4 p-4">
            <Badge tone="blue">{businessesRows.length} registered businesses</Badge>
            <Badge tone={suspendedUsers.length ? 'red' : 'green'}>{suspendedUsers.length} suspended users</Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}
