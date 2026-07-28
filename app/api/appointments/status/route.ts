import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { triggerWorkflows } from '@/lib/workflow/engine'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointmentId, status } = body

    if (!appointmentId || !status) {
      return NextResponse.json({ error: 'appointmentId and status are required' }, { status: 400 })
    }

    if (!['completed', 'no_show'].includes(status)) {
      return NextResponse.json({ error: 'Status must be "completed" or "no_show"' }, { status: 400 })
    }

    const existing = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1)

    if (!existing.length) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const apt = existing[0]

    if (apt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))

    const trigger = status === 'completed' ? 'appointment_completed' : 'appointment_no_show'

    triggerWorkflows(trigger, {
      id: apt.id,
      userId: apt.userId,
      customerName: apt.customerName,
      customerEmail: apt.customerEmail,
      customerPhone: apt.customerPhone,
      eventStart: apt.eventStart,
      eventEnd: apt.eventEnd,
      duration: apt.duration,
      status,
      notes: apt.notes,
      manageToken: apt.manageToken,
    }).catch(e => console.error(`[Workflow] ${trigger} trigger failed:`, e))

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Failed to update appointment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
