import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/tables'
import { eq, desc, and, or, like, gte, lte, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const duration = searchParams.get('duration') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
  const offset = (page - 1) * limit

  const conditions: any[] = [eq(appointments.userId, session.user.id)]

  if (search) {
    conditions.push(
      or(
        like(appointments.customerName, `%${search}%`),
        like(appointments.customerPhone, `%${search}%`),
      )
    )
  }

  if (status === 'upcoming') {
    conditions.push(eq(appointments.status, 'confirmed'), gte(appointments.eventStart, new Date()))
  } else if (status === 'cancelled') {
    conditions.push(eq(appointments.status, 'cancelled'))
  } else if (status === 'completed') {
    conditions.push(
      or(
        eq(appointments.status, 'completed'),
        lte(appointments.eventStart, new Date()),
      )
    )
  } else if (status === 'this-week') {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    conditions.push(gte(appointments.eventStart, startOfWeek), lte(appointments.eventStart, endOfWeek))
  } else if (status === 'next-week') {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfNextWeek = new Date(startOfWeek)
    startOfNextWeek.setDate(startOfWeek.getDate() + 7)
    const endOfNextWeek = new Date(startOfNextWeek)
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 7)
    conditions.push(gte(appointments.eventStart, startOfNextWeek), lte(appointments.eventStart, endOfNextWeek))
  }

  if (from) {
    const fromDate = new Date(from)
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(appointments.eventStart, fromDate))
    }
  }

  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    if (!isNaN(toDate.getTime())) {
      conditions.push(lte(appointments.eventStart, toDate))
    }
  }

  if (duration) {
    const dur = parseInt(duration, 10)
    if (!isNaN(dur)) {
      conditions.push(eq(appointments.duration, dur))
    }
  }

  const where = and(...conditions)

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(where)

  const total = Number(totalResult?.count || 0)
  const totalPages = Math.ceil(total / limit)

  const rows = await db
    .select()
    .from(appointments)
    .where(where)
    .orderBy(desc(appointments.eventStart))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    appointments: rows,
    total,
    page,
    limit,
    totalPages,
  })
}
