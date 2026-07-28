'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  appointments,
  googleCalendars,
  manualBlocks,
  businesses,
} from '@/lib/db/tables'
import { eq, and, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { syncAppointmentToContact, syncAppointmentStatusChange } from '@/lib/bos/appointment-bridge'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getAvailableSlots(
  slug: string,
  date: Date,
  duration: number = 30
) {
  // Find business by slug
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, slug))
    .limit(1)

  if (!business.length) {
    throw new Error('Business not found')
  }

  const businessId = business[0].userId

  // Get calendar for this business
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, businessId))
    .limit(1)

  if (!calendar.length) {
    throw new Error('No calendar configured')
  }

  const cal = calendar[0]
  const startOfDay = new Date(date)
  startOfDay.setHours(cal.workingHoursStart || 9, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours((cal.workingHoursEnd || 17) - duration / 60, 59, 59, 999)

  // Get existing appointments and blocks
  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, businessId),
        gte(appointments.eventStart, startOfDay),
        lte(appointments.eventEnd, endOfDay)
      )
    )

  const blockedTimes = await db
    .select()
    .from(manualBlocks)
    .where(
      and(
        eq(manualBlocks.userId, businessId),
        gte(manualBlocks.blockStart, startOfDay),
        lte(manualBlocks.blockEnd, endOfDay)
      )
    )

  // Generate available slots
  const slots: Date[] = []
  const slotDurationMs = duration * 60 * 1000

  for (
    let current = new Date(startOfDay);
    current < endOfDay;
    current = new Date(current.getTime() + slotDurationMs)
  ) {
    const slotEnd = new Date(current.getTime() + slotDurationMs)

    // Check if slot conflicts with appointments
    const hasAppointmentConflict = existingAppointments.some(
      (apt) => current < apt.eventEnd && slotEnd > apt.eventStart
    )

    // Check if slot conflicts with blocks
    const hasBlockConflict = blockedTimes.some(
      (block) => current < block.blockEnd && slotEnd > block.blockStart
    )

    if (!hasAppointmentConflict && !hasBlockConflict) {
      slots.push(new Date(current))
    }
  }

  return slots
}

export async function createAppointment(
  slug: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  eventStart: Date,
  duration: number = 30,
  notes?: string
) {
  // Find business
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, slug))
    .limit(1)

  if (!business.length) {
    throw new Error('Business not found')
  }

  const businessUserId = business[0].userId

  // Get calendar
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, businessUserId))
    .limit(1)

  if (!calendar.length) {
    throw new Error('No calendar configured')
  }

  if (eventStart.getTime() <= Date.now()) {
    throw new Error('Cannot book appointments on past dates. Please select a future date.')
  }

  const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000)

  // Check if slot is still available
  const conflict = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, businessUserId),
        gte(appointments.eventStart, eventStart),
        lte(appointments.eventEnd, eventEnd)
      )
    )

  if (conflict.length > 0) {
    throw new Error('Slot is no longer available')
  }

  const result = await db
    .insert(appointments)
    .values({
      userId: businessUserId,
      calendarId: calendar[0].id,
      customerName,
      customerEmail,
      customerPhone,
      eventStart,
      eventEnd,
      duration,
      status: 'confirmed',
      notes: notes || null,
      reminderSent: false,
    })
    .returning()

  const apt = result[0]

  syncAppointmentToContact(businessUserId, {
    id: apt.id,
    customerName,
    customerEmail,
    customerPhone,
    eventStart,
    duration,
    status: 'confirmed',
  }).catch(() => {})

  return apt
}

export async function getAppointmentsByStatus(status: string) {
  const userId = await getUserId()

  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId), eq(appointments.status, status)))
}

export async function updateAppointmentStatus(
  appointmentId: number,
  newStatus: string
) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)))
    .limit(1)

  if (!existing.length) return

  await db
    .update(appointments)
    .set({ status: newStatus })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)))

  if (existing[0].status !== newStatus) {
    syncAppointmentStatusChange(
      userId,
      appointmentId,
      existing[0].customerEmail,
      existing[0].status,
      newStatus
    ).catch(() => {})
  }
}

export async function cancelAppointment(appointmentId: number) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)))
    .limit(1)

  if (!existing.length) return

  await db
    .update(appointments)
    .set({ status: 'cancelled' })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.userId, userId)))

  if (existing[0].status !== 'cancelled') {
    syncAppointmentStatusChange(
      userId,
      appointmentId,
      existing[0].customerEmail,
      existing[0].status,
      'cancelled'
    ).catch(() => {})
  }
}
