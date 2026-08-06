import { NextResponse } from 'next/server'
import { desc, eq, like, and, gte, lte, or } from 'drizzle-orm'
import { requireAdminApi } from '@/lib/admin'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? ''
  const targetType = searchParams.get('targetType') ?? ''
  const q = searchParams.get('q') ?? ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))

  const conditions = []
  if (action) conditions.push(eq(auditLogs.action, action))
  if (targetType) conditions.push(eq(auditLogs.targetType, targetType))
  if (q) {
    conditions.push(or(
      like(auditLogs.actorEmail, `%${q}%`),
      like(auditLogs.action, `%${q}%`),
      like(auditLogs.targetId, `%${q}%`)
    )!)
  }
  if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)))
  if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)))

  const where = conditions.length ? and(...conditions) : undefined
  const logs = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalRows = await db
    .select({ count: auditLogs.id })
    .from(auditLogs)
    .where(where)

  return NextResponse.json({
    logs,
    total: totalRows.length,
    page,
    pageSize,
  })
}

// CSV export of matching logs
export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(5000)

  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = [
    ['id', 'time', 'actor_email', 'action', 'target_type', 'target_id', 'metadata'].join(','),
    ...logs.map((l) =>
      [l.id, new Date(l.createdAt).toISOString(), l.actorEmail, l.action, l.targetType, l.targetId, esc(l.metadata)].join(',')
    ),
  ]

  return new NextResponse('\ufeff' + rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="audit-logs.csv"',
    },
  })
}
