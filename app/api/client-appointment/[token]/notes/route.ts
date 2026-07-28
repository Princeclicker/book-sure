import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'

const NOTES_MAX_LENGTH = 500

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await req.json()
    const { notes } = body

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 })
    }

    if (notes.length > NOTES_MAX_LENGTH) {
      return NextResponse.json({ error: `Notes must be ${NOTES_MAX_LENGTH} characters or less` }, { status: 400 })
    }

    const existing = await db
      .select()
      .from(appointments)
      .where(eq(appointments.manageToken, token))
      .limit(1)

    if (!existing.length) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const apt = existing[0]

    if (apt.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot edit notes for a cancelled appointment' }, { status: 400 })
    }

    if (new Date(apt.eventStart).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot edit notes for a past appointment' }, { status: 400 })
    }

    await db
      .update(appointments)
      .set({
        notes: notes || null,
        notesUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appointments.manageToken, token))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
