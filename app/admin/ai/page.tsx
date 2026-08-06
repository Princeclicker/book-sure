import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, jsn, getSetting } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiProviders, aiInsights, businesses, businessMeta } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { Brain, Cpu, Lightbulb, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminAiPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [providers, insights, metaRows, bizRows] = await Promise.all([
    db.select().from(aiProviders),
    db.select().from(aiInsights),
    db.select().from(businessMeta).orderBy(sql`aiUsageTokens desc`).limit(20),
    db.select({ id: businesses.id, businessName: businesses.businessName }).from(businesses),
  ])

  const bizName = new Map(bizRows.map((b) => [b.id, b.businessName]))

  const engine = await getSetting('aiEngine', 'rules')

  const insightTypes = new Map<string, number>()
  for (const i of insights) insightTypes.set(i.insightType, (insightTypes.get(i.insightType) ?? 0) + 1)

  const providerCount = new Map<string, number>()
  const activeProviderCount = new Map<string, number>()
  for (const p of providers) {
    providerCount.set(p.providerType, (providerCount.get(p.providerType) ?? 0) + 1)
    if (p.isActive) activeProviderCount.set(p.providerType, (activeProviderCount.get(p.providerType) ?? 0) + 1)
  }

  return (
    <div>
      <PageHeader
        title="AI Management"
        description="Monitor AI providers, insights and per-business AI usage across the platform."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Insights" value={fmtNum(insights.length)} icon={<Lightbulb className="h-4 w-4" />} />
        <StatCard label="Active Providers" value={fmtNum([...activeProviderCount.values()].reduce((a, b) => a + b, 0))} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Businesses with AI meta" value={fmtNum(metaRows.length)} icon={<Brain className="h-4 w-4" />} />
        <StatCard label="AI Engine" value={engine === 'rules' ? 'Local rules' : engine} tone="accent" icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="AI Insights by Type">
          <div className="divide-y divide-border">
            {insightTypes.size === 0 && <p className="p-4 text-sm text-muted-foreground">No insights generated yet.</p>}
            {[...insightTypes.entries()].map(([type, count]) => (
              <div key={type} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{type}</span>
                <Badge tone="blue">{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI Providers (platform-wide)">
          <div className="divide-y divide-border">
            {providerCount.size === 0 && <p className="p-4 text-sm text-muted-foreground">No AI providers configured yet.</p>}
            {[...providerCount.entries()].map(([type, count]) => (
              <div key={type} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{type}</span>
                <span className="flex items-center gap-2">
                  <Badge tone="blue">{fmtNum(count)} connected</Badge>
                  <Badge tone={statusTone((activeProviderCount.get(type) ?? 0) > 0 ? 'active' : 'inactive')}>
                    {(activeProviderCount.get(type) ?? 0) > 0 ? 'active' : 'inactive'}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Top AI Users (by token usage)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Business</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">AI tokens</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Plan</th>
                </tr>
              </thead>
              <tbody>
                {metaRows.length === 0 && (
                  <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No AI usage tracked yet.</td></tr>
                )}
                {metaRows.map((m) => (
                  <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{bizName.get(m.businessId) ?? `Business #${m.businessId}`}</td>
                    <td className="p-3 text-muted-foreground">{fmtNum(jsn<number>(m.aiUsageTokens, 0))}</td>
                    <td className="p-3"><Badge tone={statusTone(m.plan)}>{m.plan}</Badge></td>
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
