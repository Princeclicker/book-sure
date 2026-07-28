import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq, and, gte, lte } from 'drizzle-orm'
import { sendRescheduleEmail } from '@/lib/email/service'
import { triggerWorkflows } from '@/lib/workflow/engine'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = await req.json()
    const { eventStart, duration } = body

    if (!eventStart) {
      return NextResponse.json({ error: 'eventStart is required' }, { status: 400 })
    }

    const newStart = new Date(eventStart)
    if (isNaN(newStart.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }

    if (newStart.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot reschedule to a past time' }, { status: 400 })
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
      return NextResponse.json({ error: 'Cannot reschedule a cancelled appointment' }, { status: 400 })
    }

    if (new Date(apt.eventStart).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot reschedule a past appointment' }, { status: 400 })
    }

    const dur = duration || apt.duration
    const newEnd = new Date(newStart.getTime() + dur * 60 * 1000)

    const conflict = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, apt.userId),
          eq(appointments.status, 'confirmed'),
          gte(appointments.eventStart, newStart),
          lte(appointments.eventStart, newEnd)
        )
      )

    if (conflict.length > 0) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
    }

    const originalStart = apt.rescheduledFrom || apt.eventStart

    await db
      .update(appointments)
      .set({
        eventStart: newStart,
        eventEnd: newEnd,
        duration: dur,
        rescheduledFrom: originalStart,
        updatedAt: new Date(),
      })
      .where(eq(appointments.manageToken, token))

    // Fire-and-forget: send reschedule email
    const biz = await db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, apt.userId))
      .limit(1)

    if (biz.length > 0 && !apt.rescheduledEmailSent) {
      sendRescheduleEmail(
        {
          id: apt.id,
          userId: apt.userId,
          customerName: apt.customerName,
          customerEmail: apt.customerEmail,
          eventStart: newStart,
          duration: dur,
          manageToken: apt.manageToken,
          clientToken: apt.clientToken,
          rescheduledFrom: originalStart,
        },
        {
          businessName: biz[0].businessName,
          businessSlug: biz[0].businessSlug,
        }
      ).catch(e => console.error('[Email] Reschedule email failed:', e))
    }

    // Fire-and-forget: trigger workflows for reschedule
    triggerWorkflows('appointment_rescheduled', {
      id: apt.id,
      userId: apt.userId,
      customerName: apt.customerName,
      customerEmail: apt.customerEmail,
      customerPhone: apt.customerPhone,
      eventStart: newStart,
      eventEnd: newEnd,
      duration: dur,
      status: apt.status || 'confirmed',
      notes: apt.notes,
      manageToken: apt.manageToken,
      clientToken: apt.clientToken,
    }).catch(e => console.error('[Workflow] Reschedule trigger failed:', e))

    return NextResponse.json({ success: true, eventStart: newStart.toISOString(), eventEnd: newEnd.toISOString() })
  } catch (error) {
    console.error('Failed to reschedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
