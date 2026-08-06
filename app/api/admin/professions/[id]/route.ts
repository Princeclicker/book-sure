import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit, str } from '@/lib/admin'
import { db } from '@/lib/db'
import { professions } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = Number(rawId)
  const body = (await req.json().catch(() => ({}))) as Record<string, any>

  const row = await db
    .select()
    .from(professions)
    .where(eq(professions.id, id))
    .limit(1)
    .then((r) => r[0] || null)
  if (!row) return NextResponse.json({ error: 'Profession not found' }, { status: 404 })

  const patch: Record<string, any> = { updatedAt: new Date() }
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.description === 'string') patch.description = body.description
  if (typeof body.isArchived === 'boolean') patch.isArchived = body.isArchived
  if (body.config && typeof body.config === 'object') patch.config = str(body.config)

  await db.update(professions).set(patch).where(eq(professions.id, id))
  await audit('profession.update', 'profession', row.slug, { id })
  return NextResponse.json({ ok: true, id })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = Number(rawId)
  const row = await db
    .select()
    .from(professions)
    .where(eq(professions.id, id))
    .limit(1)
    .then((r) => r[0] || null)
  if (!row) return NextResponse.json({ error: 'Profession not found' }, { status: 404 })

  if (!row.isCustom) {
    return NextResponse.json(
      { error: 'Built-in professions cannot be deleted. Archive them instead.' },
      { status: 400 }
    )
  }

  await db.delete(professions).where(eq(professions.id, id))
  await audit('profession.delete', 'profession', row.slug, { id })
  return NextResponse.json({ ok: true, deleted: id })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const id = Number(rawId)
  const body = (await req.json().catch(() => ({}))) as Record<string, any>

  const row = await db
    .select()
    .from(professions)
    .where(eq(professions.id, id))
    .limit(1)
    .then((r) => r[0] || null)
  if (!row) return NextResponse.json({ error: 'Profession not found' }, { status: 404 })

  if (body.action === 'duplicate') {
    const baseSlug = `${row.slug}-copy`
    let slug = baseSlug
    let n = 2
    for (;;) {
      const clash = await db
        .select()
        .from(professions)
        .where(eq(professions.slug, slug))
        .limit(1)
        .then((r) => r[0] || null)
      if (!clash) break
      slug = `${baseSlug}-${n++}`
    }
    await db.insert(professions).values({
      slug,
      name: `${row.name} (Copy)`,
      description: row.description,
      config: str(row.config),
      isArchived: row.isArchived,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await audit('profession.duplicate', 'profession', slug, { from: row.slug })
    return NextResponse.json({ ok: true, slug })
  }

  if (body.action === 'archive' || body.action === 'unarchive') {
    const next = body.action === 'archive'
    await db.update(professions).set({ isArchived: next, updatedAt: new Date() }).where(eq(professions.id, id))
    await audit('profession.archive', 'profession', row.slug, { isArchived: next })
    return NextResponse.json({ ok: true, isArchived: next })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
