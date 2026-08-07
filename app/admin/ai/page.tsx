import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { getAdminUser, fmtNum, getSetting } from '@/lib/admin'
import { db } from '@/lib/db'
import {
  aiProviders,
  aiInsights,
  businesses,
  businessMeta,
  user as userTable,
} from '@/lib/db/tables'
import { parseProviderConfig } from '@/lib/ai/admin'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { AiEngineConfig } from '@/components/admin/ai/engine-config'
import { ProviderManager } from '@/components/admin/ai/provider-manager'
import { InsightManager } from '@/components/admin/ai/insight-manager'
import { UsageManager } from '@/components/admin/ai/usage-manager'
import { Brain, Cpu, Lightbulb, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

function maskKey(key?: string | null): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export default async function AdminAiPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [providers, insights, metaRows, bizRows, userRows] = await Promise.all([
    db.select().from(aiProviders),
    db.select().from(aiInsights),
    db.select().from(businessMeta).orderBy(desc(businessMeta.aiUsageTokens)),
    db.select({ id: businesses.id, businessName: businesses.businessName, userId: businesses.userId }).from(businesses),
    db.select({ id: userTable.id, email: userTable.email }).from(userTable),
  ])

  const bizName = new Map(bizRows.map((b) => [b.id, b.businessName]))

  const ownerNameByUserId = new Map<string, string>()
  for (const b of bizRows) {
    if (!ownerNameByUserId.has(b.userId)) ownerNameByUserId.set(b.userId, b.businessName)
  }
  for (const u of userRows) {
    if (!ownerNameByUserId.has(u.id)) ownerNameByUserId.set(u.id, u.email)
  }

  const engine = await getSetting('aiEngine', 'rules')
  const replyTone = await getSetting('aiReplyTone', 'professional')

  const providerRows = providers.map((p) => ({
    id: p.id,
    userId: p.userId,
    providerType: p.providerType,
    apiKey: maskKey(p.apiKey),
    hasKey: Boolean(p.apiKey),
    isActive: p.isActive ?? false,
    config: parseProviderConfig(p.config),
    createdAt: p.createdAt,
  }))

  const insightRows = insights.map((i) => ({
    id: i.id,
    userId: i.userId,
    insightType: i.insightType,
    title: i.title,
    description: i.description,
    priority: i.priority ?? 'medium',
    isRead: i.isRead ?? false,
    isDismissed: i.isDismissed ?? false,
    createdAt: new Date(i.createdAt).toISOString(),
  }))

  const usageRows = metaRows
    .map((m) => ({
      businessId: m.businessId,
      businessName: bizName.get(m.businessId) ?? `Business #${m.businessId}`,
      plan: m.plan ?? 'free',
      tokens: Number(m.aiUsageTokens ?? 0),
    }))
    .filter((m) => bizName.has(m.businessId))

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
        description="Configure AI providers, engine settings, insights and per-business AI usage across the platform."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Insights" value={fmtNum(insights.length)} icon={<Lightbulb className="h-4 w-4" />} />
        <StatCard label="Active Providers" value={fmtNum([...activeProviderCount.values()].reduce((a, b) => a + b, 0))} icon={<Cpu className="h-4 w-4" />} />
        <StatCard label="Businesses with AI meta" value={fmtNum(metaRows.length)} icon={<Brain className="h-4 w-4" />} />
        <StatCard label="AI Engine" value={engine === 'rules' ? 'Local rules' : engine} tone="accent" icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="mt-6">
        <Card title="AI engine configuration" description="Choose the engine that powers insights and AI replies.">
          <AiEngineConfig engine={engine} replyTone={replyTone} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
        <Card
          title="AI Providers"
          description="Connect API keys for OpenAI, Claude and Gemini, assign them to businesses, and validate them."
        >
          <ProviderManager
            providers={providerRows}
            businesses={bizRows.map((b) => ({ id: b.id, businessName: b.businessName }))}
            ownerNameByUserId={Object.fromEntries(ownerNameByUserId)}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="AI Insights"
          description="All insights generated across the platform. Filter, dismiss and regenerate from the local rules engine."
        >
          <InsightManager
            insights={insightRows}
            ownerNameByUserId={Object.fromEntries(ownerNameByUserId)}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card
          title="AI Usage by Business"
          description="Per-business token consumption. Reset counters or set a specific value."
        >
          <UsageManager rows={usageRows} />
        </Card>
      </div>
    </div>
  )
}
