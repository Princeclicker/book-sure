import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { platformNotifications } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

// Mark a notification as read, or delete it.
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
    .from(platformNotifications)
    .where(eq(platformNotifications.id, id))
    .limit(1)
    .then((r) => r[0] || null)
  if (!row) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

  if (body.action === 'delete') {
    await db.delete(platformNotifications).where(eq(platformNotifications.id, id))
    await audit('notification.delete', 'notification', id, { title: row.title })
    return NextResponse.json({ ok: true, deleted: id })
  }

  await db
    .update(platformNotifications)
    .set({ isRead: true })
    .where(eq(platformNotifications.id, id))
  return NextResponse.json({ ok: true, read: true })
}
