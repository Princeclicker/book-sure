import { NextResponse } from 'next/server'
import { requireAdminApi, audit } from '@/lib/admin'
import { db } from '@/lib/db'
import { platformNotifications } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

const SEVERITIES = ['info', 'warning', 'danger', 'success']
const TYPES = ['platform', 'system', 'release', 'announcement']

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifications = await db.select().from(platformNotifications)
  return NextResponse.json({ notifications })
}

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const title = String(body.title ?? '').trim()
  const message = String(body.message ?? '').trim()
  const severity = String(body.severity ?? 'info')
  const type = String(body.type ?? 'platform')

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
  }
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const inserted = await db
    .insert(platformNotifications)
    .values({
      type,
      severity,
      title,
      message,
      isRead: false,
      createdAt: new Date(),
    })
    .returning({ id: platformNotifications.id })

  await audit('notification.create', 'notification', inserted[0]?.id ?? null, { title, severity })
  return NextResponse.json({ ok: true, id: inserted[0]?.id ?? null })
}
