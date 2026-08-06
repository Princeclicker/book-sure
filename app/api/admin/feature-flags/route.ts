import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const flags = await db.select().from(featureFlags)
  return NextResponse.json({ flags })
}

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const key = String(body.key ?? '')
  const enabled = Boolean(body.enabled)
  const label = String(body.label ?? key)
  const description = String(body.description ?? '')
  const category = String(body.category ?? 'general')

  if (!key) return NextResponse.json({ error: 'Flag key is required' }, { status: 400 })

  const existing = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1)
    .then((r) => r[0] || null)

  if (existing) {
    await db
      .update(featureFlags)
      .set({ enabled, label, description, category, updatedAt: new Date() })
      .where(eq(featureFlags.key, key))
  } else {
    await db.insert(featureFlags).values({
      key, enabled, label, description, category,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await audit('feature_flag.set', 'feature_flag', key, { key, enabled })
  return NextResponse.json({ ok: true, key, enabled })
}
