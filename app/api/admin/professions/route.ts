import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit, str } from '@/lib/admin'
import { db } from '@/lib/db'
import { professions } from '@/lib/db/tables'
import { defaultProfessionConfig } from '@/lib/admin-catalog'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const slug = String(body.slug ?? '')
  const name = String(body.name ?? '')
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, or dashes' }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(professions)
    .where(eq(professions.slug, slug))
    .limit(1)
    .then((r) => r[0] || null)
  if (existing) {
    return NextResponse.json({ error: 'A profession with this slug already exists' }, { status: 409 })
  }

  const config = defaultProfessionConfig()
  await db.insert(professions).values({
    slug,
    name,
    description: String(body.description ?? ''),
    config: str(config),
    isArchived: false,
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await audit('profession.create', 'profession', slug, { slug, name })
  return NextResponse.json({ ok: true, slug })
}
