import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const slug = request.nextUrl.searchParams.get('slug')

  if (!token) {
    return NextResponse.json({ error: 'Missing client token' }, { status: 400 })
  }

  if (!slug) {
    return NextResponse.json({ error: 'Missing business slug' }, { status: 400 })
  }

  try {
    const conditions = [
      eq(appointments.clientToken, token),
      eq(businesses.businessSlug, slug),
    ]

    const rows = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerEmail: appointments.customerEmail,
        customerPhone: appointments.customerPhone,
        eventStart: appointments.eventStart,
        eventEnd: appointments.eventEnd,
        duration: appointments.duration,
        status: appointments.status,
        notes: appointments.notes,
        notesUpdatedAt: appointments.notesUpdatedAt,
        rescheduledFrom: appointments.rescheduledFrom,
        manageToken: appointments.manageToken,
        createdAt: appointments.createdAt,
        businessName: businesses.businessName,
        businessSlug: businesses.businessSlug,
        brandColor: businesses.brandColor,
      })
      .from(appointments)
      .innerJoin(businesses, eq(appointments.userId, businesses.userId))
      .where(and(...conditions))
      .orderBy(desc(appointments.eventStart))

    const now = new Date()
    const upcoming = rows.filter(a => a.status === 'confirmed' && new Date(a.eventEnd) > now)
    const past = rows.filter(a => a.status !== 'confirmed' || new Date(a.eventEnd) <= now)

    return NextResponse.json({
      appointments: rows,
      upcoming,
      past,
    })
  } catch (error) {
    console.error('Failed to fetch client appointments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
