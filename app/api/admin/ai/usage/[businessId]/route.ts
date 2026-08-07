import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { businessMeta, businesses } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId: businessIdStr } = await params
  const businessId = Number(businessIdStr)
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: 'Invalid business id' }, { status: 400 })
  }

  const biz = await db
    .select({ id: businesses.id, businessName: businesses.businessName })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then((r) => r[0] || null)
  if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const action = String(body.action ?? '')
  let tokens: number

  if (action === 'reset') {
    tokens = 0
  } else if (action === 'set') {
    tokens = Math.max(0, Number(body.tokens) || 0)
  } else {
    return NextResponse.json({ error: 'action must be "reset" or "set"' }, { status: 400 })
  }

  const existing = await db
    .select({ id: businessMeta.id })
    .from(businessMeta)
    .where(eq(businessMeta.businessId, businessId))
    .limit(1)
    .then((r) => r[0] || null)

  if (existing) {
    await db
      .update(businessMeta)
      .set({ aiUsageTokens: tokens, updatedAt: new Date() })
      .where(eq(businessMeta.businessId, businessId))
  } else {
    await db.insert(businessMeta).values({
      businessId,
      aiUsageTokens: tokens,
      status: 'active',
      plan: 'free',
      planStatus: 'active',
      storageBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await audit('ai.usage.update', 'business', businessId, {
    business: biz.businessName,
    action,
    tokens,
  })
  return NextResponse.json({ ok: true, businessId, tokens })
}
