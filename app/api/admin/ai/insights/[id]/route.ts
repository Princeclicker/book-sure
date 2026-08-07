import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiInsights } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const insightId = Number(id)
  if (!Number.isInteger(insightId) || insightId <= 0) {
    return NextResponse.json({ error: 'Invalid insight id' }, { status: 400 })
  }

  const existing = await db
    .select({ id: aiInsights.id })
    .from(aiInsights)
    .where(eq(aiInsights.id, insightId))
    .limit(1)
    .then((r) => r[0] || null)
  if (!existing) return NextResponse.json({ error: 'Insight not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const patch: Record<string, unknown> = {}
  if (typeof body.isRead === 'boolean') patch.isRead = body.isRead
  if (typeof body.isDismissed === 'boolean') patch.isDismissed = body.isDismissed
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  await db.update(aiInsights).set(patch).where(eq(aiInsights.id, insightId))
  await audit('ai.insight.update', 'ai_insight', insightId, patch)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const insightId = Number(id)
  if (!Number.isInteger(insightId) || insightId <= 0) {
    return NextResponse.json({ error: 'Invalid insight id' }, { status: 400 })
  }

  const existing = await db
    .select({ id: aiInsights.id, insightType: aiInsights.insightType })
    .from(aiInsights)
    .where(eq(aiInsights.id, insightId))
    .limit(1)
    .then((r) => r[0] || null)
  if (!existing) return NextResponse.json({ error: 'Insight not found' }, { status: 404 })

  await db.delete(aiInsights).where(eq(aiInsights.id, insightId))
  await audit('ai.insight.delete', 'ai_insight', insightId, {
    insightType: existing.insightType,
  })
  return NextResponse.json({ ok: true })
}
