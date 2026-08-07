import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiInsights, businessProfiles } from '@/lib/db/tables'
import { generateInsights } from '@/lib/ai/rules-engine'
import type { ProfessionId } from '@/lib/profession'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? ''
  const priority = url.searchParams.get('priority') ?? ''
  const q = url.searchParams.get('q') ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const perPage = 50

  let rows = await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt)).limit(500)

  if (type) rows = rows.filter((r) => r.insightType === type)
  if (priority) rows = rows.filter((r) => r.priority === priority)
  if (q) {
    const needle = q.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle)
    )
  }

  const total = rows.length
  const start = (page - 1) * perPage
  const insights = rows.slice(start, start + perPage)

  const types = [...new Set(rows.map((r) => r.insightType))].sort()
  const priorities = [...new Set(rows.map((r) => r.priority ?? 'medium'))].sort()

  return NextResponse.json({ insights, total, page, perPage, types, priorities })
}

export async function POST() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      console.error(`[ai.regenerate] failed for ${profile.userId}:`, e)
      withErrors++
    }
  }

  await audit('ai.insights.regenerate', 'ai_insight', null, {
    businesses: profiles.length,
    generated,
    withErrors,
  })
  return NextResponse.json({ ok: true, businesses: profiles.length, generated, withErrors })
}
