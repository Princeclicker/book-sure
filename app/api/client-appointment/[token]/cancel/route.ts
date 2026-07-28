import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { sendCancellationEmail } from '@/lib/email/service'
import { triggerWorkflows } from '@/lib/workflow/engine'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

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
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 })
    }

    if (new Date(apt.eventStart).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Cannot cancel a past appointment' }, { status: 400 })
    }

    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(appointments.manageToken, token))

    // Fire-and-forget: send cancellation email
    const biz = await db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, apt.userId))
      .limit(1)

    if (biz.length > 0 && !apt.cancelledEmailSent) {
      sendCancellationEmail(
        {
          id: apt.id,
          userId: apt.userId,
          customerName: apt.customerName,
          customerEmail: apt.customerEmail,
          eventStart: apt.eventStart,
          duration: apt.duration,
        },
        { businessName: biz[0].businessName }
      ).catch(e => console.error('[Email] Cancellation email failed:', e))
    }

    // Fire-and-forget: trigger workflows for cancellation
    triggerWorkflows('appointment_cancelled', {
      id: apt.id,
      userId: apt.userId,
      customerName: apt.customerName,
      customerEmail: apt.customerEmail,
      customerPhone: apt.customerPhone,
      eventStart: apt.eventStart,
      eventEnd: apt.eventEnd,
      duration: apt.duration,
      status: 'cancelled',
      notes: apt.notes,
      manageToken: apt.manageToken,
    }).catch(e => console.error('[Workflow] Cancel trigger failed:', e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to cancel appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
