import { redirect } from 'next/navigation'
import { getAdminUser, getSetting } from '@/lib/admin'
import { PageHeader, Card } from '@/components/admin/page'
import { Badge } from '@/components/admin/badge'
import { Code2, Webhook, Rocket, Database } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ENDPOINTS = [
  { method: 'POST', path: '/api/auth/sign-in/email', desc: 'Email + password sign-in' },
  { method: 'POST', path: '/api/auth/sign-up/email', desc: 'Email + password registration' },
  { method: 'POST', path: '/api/auth/google/callback', desc: 'Google OAuth callback' },
  { method: 'GET', path: '/api/appointments', desc: 'User appointment data' },
  { method: 'GET', path: '/api/reminders/daily', desc: 'Daily reminder sweep trigger' },
  { method: 'POST', path: '/api/admin/businesses/[id]', desc: 'Admin business actions (suspend/plan/delete/impersonate)' },
  { method: 'POST', path: '/api/admin/users/[id]', desc: 'Admin user actions (suspend/verify/role/reset/impersonate)' },
  { method: 'POST', path: '/api/admin/feature-flags', desc: 'Admin feature flag toggle' },
  { method: 'POST', path: '/api/admin/notifications', desc: 'Admin platform notification publish' },
  { method: 'GET', path: '/api/admin/audit-logs', desc: 'Admin audit log query + CSV export' },
]

export default async function AdminDeveloperPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [rateLimit, publicApi, webhooks] = await Promise.all([
    getSetting('apiRateLimit', 100),
    getSetting('publicApiEnabled', false),
    getSetting('webhooksEnabled', false),
  ])

  return (
    <div>
      <PageHeader title="Developer Tools" description="API reference and platform developer configuration." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Runtime">
          <div className="space-y-2 p-4 text-sm">
            <Row label="Environment" value={process.env.NODE_ENV ?? 'development'} />
            <Row label="Rate limit (req/h)" value={String(rateLimit)} />
            <Row label="Public API" value={publicApi ? 'Enabled' : 'Disabled'} />
            <Row label="Webhooks" value={webhooks ? 'Enabled' : 'Disabled'} />
          </div>
        </Card>

        <Card title="Database">
          <div className="space-y-2 p-4 text-sm">
            <Row label="Driver" value={process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite (dev)'} />
            <Row label="Host" value={process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'local file'} />
          </div>
        </Card>

        <Card title="Build">
          <div className="space-y-2 p-4 text-sm">
            <Row label="Runtime" value="Next.js (App Router)" />
            <Row label="Type checking" value="ignored at build" />
            <Row label="Images" value="unoptimized" />
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="API endpoints">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Path</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={e.path} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <Badge tone={e.method === 'GET' ? 'green' : e.method === 'POST' ? 'blue' : 'amber'}>{e.method}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">{e.path}</td>
                    <td className="p-3 text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Info icon={<Webhook className="h-4 w-4" />} title="Webhooks" body="Outgoing webhooks can be enabled via the Integrations page / Settings." />
        <Info icon={<Code2 className="h-4 w-4" />} title="Admin API" body="All /api/admin routes require an authenticated admin session." />
        <Info icon={<Rocket className="h-4 w-4" />} title="Deployment" body="Deployed on Vercel against a PostgreSQL database (Neon)." />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function Info({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card title={title}>
      <div className="flex items-start gap-3 p-4">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </Card>
  )
}
