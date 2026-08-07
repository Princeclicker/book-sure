import { sql, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { businessMeta, aiInsights, businessProfiles } from '@/lib/db/tables'
import { generateInsights } from '@/lib/ai/rules-engine'
import type { ProfessionId } from '@/lib/profession'

export async function recordAiUsage(businessId: number, tokens: number): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return
  const existing = await db
    .select({ id: businessMeta.id })
    .from(businessMeta)
    .where(eq(businessMeta.businessId, businessId))
    .limit(1)
    .then((r: any[]) => r[0] || null)

  if (existing) {
    await db
      .update(businessMeta)
      .set({
        aiUsageTokens: sql`${businessMeta.aiUsageTokens} + ${tokens}`,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businessMeta.businessId, businessId))
  } else {
    await db.insert(businessMeta).values({
      businessId,
      status: 'active',
      plan: 'free',
      planStatus: 'active',
      storageBytes: 0,
      aiUsageTokens: tokens,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

export async function syncInsightsForAll(): Promise<{
  businesses: number
  generated: number
  withErrors: number
}> {
  const profiles = await db.select().from(businessProfiles)
  let generated = 0
  let withErrors = 0

  for (const profile of profiles) {
    try {
      const insights = await generateInsights(
        profile.userId,
        (profile.profession || 'freelancer') as ProfessionId
      )
      await db.delete(aiInsights).where(eq(aiInsights.userId, profile.userId))
      if (insights.length > 0) {
        await db.insert(aiInsights).values(
          insights.map((i) => ({
            userId: profile.userId,
            insightType: i.type,
            title: i.title,
            description: i.description,
            priority: i.priority,
            actionType: i.actionType ?? null,
            actionUrl: i.actionUrl ?? null,
            actionLabel: i.actionLabel ?? null,
            metadata: JSON.stringify(i.metadata ?? {}),
            createdAt: new Date(),
          }))
        )
        generated += insights.length
      }
    } catch (e) {
      console.error(`[ai.sync] failed for ${profile.userId}:`, e)
      withErrors++
    }
  }

  return { businesses: profiles.length, generated, withErrors }
}

export async function isInsightsStale(maxAgeMs = 12 * 60 * 60 * 1000): Promise<boolean> {
  const latest = await db
    .select({ createdAt: aiInsights.createdAt })
    .from(aiInsights)
    .orderBy(desc(aiInsights.createdAt))
    .limit(1)
    .then((r: any[]) => r[0] || null)
  if (!latest) return true
  return new Date(latest.createdAt).getTime() < Date.now() - maxAgeMs
}

export function parseMeta(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}
