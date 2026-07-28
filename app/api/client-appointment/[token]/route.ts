import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const result = await db
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
        clientToken: appointments.clientToken,
        createdAt: appointments.createdAt,
        businessSlug: businesses.businessSlug,
      })
      .from(appointments)
      .innerJoin(businesses, eq(appointments.userId, businesses.userId))
      .where(eq(appointments.manageToken, token))
      .limit(1)

    if (!result.length) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const apt = result[0]
    return NextResponse.json({ appointment: apt })
  } catch (error) {
    console.error('Failed to fetch appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
