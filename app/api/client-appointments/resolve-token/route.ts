import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing client token' }, { status: 400 })
  }

  try {
    const row = await db
      .select({
        businessSlug: businesses.businessSlug,
        businessName: businesses.businessName,
      })
      .from(appointments)
      .innerJoin(businesses, eq(appointments.userId, businesses.userId))
      .where(eq(appointments.clientToken, token))
      .orderBy(desc(appointments.eventStart))
      .limit(1)

    if (!row.length) {
      return NextResponse.json({ error: 'No appointments found for this token' }, { status: 404 })
    }

    return NextResponse.json({
      businessSlug: row[0].businessSlug,
      businessName: row[0].businessName,
    })
  } catch (error) {
    console.error('Failed to resolve token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
