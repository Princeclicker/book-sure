import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiInsights } from '@/lib/db/tables'
import { syncInsightsForAll } from '@/lib/ai/insights-sync'

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

  const { businesses, generated, withErrors } = await syncInsightsForAll()

  await audit('ai.insights.regenerate', 'ai_insight', null, {
    businesses,
    generated,
    withErrors,
  })
  return NextResponse.json({ ok: true, businesses, generated, withErrors })
}
