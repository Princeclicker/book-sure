import { redirect } from 'next/navigation'
import { desc, like, sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, getSetting } from '@/lib/admin'
import { db } from '@/lib/db'
import {
  aiProviders,
  aiInsights,
  businesses,
  businessMeta,
  auditLogs,
  appointments,
  contacts,
  user as userTable,
} from '@/lib/db/tables'
import { parseProviderConfig } from '@/lib/ai/admin'
import { syncInsightsForAll, isInsightsStale, parseMeta } from '@/lib/ai/insights-sync'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { AiEngineConfig } from '@/components/admin/ai/engine-config'
import { ProviderManager } from '@/components/admin/ai/provider-manager'
import { InsightManager } from '@/components/admin/ai/insight-manager'
import { UsageManager } from '@/components/admin/ai/usage-manager'
import { LiveRefresh } from '@/components/admin/ai/live-refresh'
import { Building2, CalendarCheck, Lightbulb, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

function maskKey(key?: string | null): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export default async function AdminAiPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const stale = await isInsightsStale()
  if (stale) await syncInsightsForAll()

  const [providers, insights, metaRows, bizRows, userRows, apptCount, contactCount, auditRows] =
    await Promise.all([
      db.select().from(aiProviders),
      db.select().from(aiInsights),
      db.select().from(businessMeta).orderBy(desc(businessMeta.aiUsageTokens)),
      db.select({ id: businesses.id, businessName: businesses.businessName, userId: businesses.userId }).from(businesses),
      db.select({ id: userTable.id, email: userTable.email }).from(userTable),
      db.select({ count: sql<number>`count(*)` }).from(appointments),
      db.select({ count: sql<number>`count(*)` }).from(contacts),
      db.select().from(auditLogs).where(like(auditLogs.action, 'ai.%')).orderBy(desc(auditLogs.createdAt)).limit(8),
    ])

  const apptsByOwner = await db
    .select({ userId: appointments.userId, count: sql<number>`count(*)` })
    .from(appointments)
    .groupBy(appointments.userId)
  const contactsByOwner = await db
    .select({ userId: contacts.userId, count: sql<number>`count(*)` })
    .from(contacts)
    .groupBy(contacts.userId)

  const metaByBizId = new Map(metaRows.map((m) => [m.businessId, m]))
  const apptsByBiz = new Map<number, number>()
  const contactsByBiz = new Map<number, number>()
  const bizIdByOwner = new Map<string, number>()
  for (const b of bizRows) {
    bizIdByOwner.set(b.userId, b.id)
    apptsByBiz.set(b.id, 0)
    contactsByBiz.set(b.id, 0)
  }
  for (const a of apptsByOwner) {
    const bizId = bizIdByOwner.get(a.userId)
    if (bizId != null) apptsByBiz.set(bizId, Number(a.count))
  }
  for (const c of contactsByOwner) {
    const bizId = bizIdByOwner.get(c.userId)
    if (bizId != null) contactsByBiz.set(bizId, Number(c.count))
  }

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

  const usageRows = bizRows.map((b) => {
    const meta = metaByBizId.get(b.id)
    return {
      businessId: b.id,
      businessName: b.businessName,
      plan: meta?.plan ?? 'free',
      tokens: Number(meta?.aiUsageTokens ?? 0),
      appointments: apptsByBiz.get(b.id) ?? 0,
      contacts: contactsByBiz.get(b.id) ?? 0,
    }
  })

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
        description="Real-time view of AI providers, engine settings, insights and usage across the platform. All figures below are computed live from the database."
        actions={<LiveRefresh />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Businesses" value={fmtNum(bizRows.length)} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Appointments booked" value={fmtNum(apptCount.count)} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard label="Contacts tracked" value={fmtNum(contactCount.count)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Insights generated" value={fmtNum(insights.length)} tone="accent" icon={<Lightbulb className="h-4 w-4" />} />
      </div>

      <div className="mt-6">
        <Card title="AI engine configuration" description="Choose the engine that powers insights and AI replies.">
          <AiEngineConfig engine={engine} replyTone={replyTone} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="AI Insights by Type">
          <div className="divide-y divide-border">
            {insightTypes.size === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No insights yet. Insights are computed from real platform data (appointments, contacts, invoices)
                and refresh automatically on page load.
              </p>
            )}
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
            {providerCount.size === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No AI providers connected yet. Add API keys below to start using OpenAI, Claude or Gemini.
              </p>
            )}
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
          title="Recent AI Activity"
          description="The latest real AI operations performed across the platform, straight from the audit log."
        >
          <div className="divide-y divide-border">
            {auditRows.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No AI operations recorded yet. Actions like regenerating insights will appear here in real time.
              </p>
            )}
            {auditRows.map((a) => {
              const meta = parseMeta(a.metadata)
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actorEmail ?? 'system'} ·{' '}
                      {Object.entries(meta)
                        .map(([k, v]) => `${k}=${String(v)}`)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}
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
          description="Real appointment and contact counts per business, plus AI token consumption from actual API usage. Manual set/reset overrides are for corrections only."
        >
          <UsageManager rows={usageRows} />
        </Card>
      </div>
    </div>
  )
}
