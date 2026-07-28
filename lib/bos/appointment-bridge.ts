import { db } from '@/lib/db'
import { contacts, contactTimeline, appointments } from '@/lib/db/tables'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Bridge: When a new appointment is created, automatically create or update
 * the corresponding contact record and add a timeline event.
 *
 * This function is designed to be called as fire-and-forget from appointment
 * creation endpoints without blocking the booking response.
 */
export async function syncAppointmentToContact(
  userId: string,
  appointment: {
    id: number
    customerName: string
    customerEmail: string
    customerPhone: string
    eventStart: Date
    duration: number
    status: string
  }
): Promise<void> {
  try {
    const contact = await findOrCreateContactFromAppointment(userId, appointment)

    await db.insert(contactTimeline).values({
      contactId: contact.id,
      userId,
      eventType: 'appointment_booked',
      title: `Appointment booked`,
      description: `Scheduled for ${appointment.eventStart.toLocaleDateString()} at ${appointment.eventStart.toLocaleTimeString()}`,
      linkedAppointmentId: appointment.id,
      metadata: {
        duration: appointment.duration,
        status: appointment.status,
      },
    })

    await db.update(contacts).set({
      totalAppointments: sql`${contacts.totalAppointments} + 1`,
      lastContactAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(contacts.id, contact.id))
  } catch (error) {
    console.error('[BOS] Failed to sync appointment to contact:', error)
  }
}

/**
 * Bridge: When an appointment status changes, update the contact timeline.
 */
export async function syncAppointmentStatusChange(
  userId: string,
  appointmentId: number,
  contactEmail: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  try {
    const contact = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.email, contactEmail)))
      .limit(1)
      .then(r => r[0] || null)

    if (!contact) return

    const eventType = newStatus === 'completed' ? 'appointment_completed'
      : newStatus === 'cancelled' ? 'appointment_cancelled'
      : 'appointment_updated'

    const title = newStatus === 'completed' ? 'Appointment completed'
      : newStatus === 'cancelled' ? 'Appointment cancelled'
      : `Appointment status changed to ${newStatus}`

    await db.insert(contactTimeline).values({
      contactId: contact.id,
      userId,
      eventType,
      title,
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      linkedAppointmentId: appointmentId,
    })

    await db.update(contacts).set({
      lastContactAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(contacts.id, contact.id))
  } catch (error) {
    console.error('[BOS] Failed to sync appointment status to contact:', error)
  }
}

/**
 * Bridge: When an invoice is paid, update the contact's total revenue.
 */
export async function syncPaymentToContact(
  userId: string,
  contactId: number,
  amount: number
): Promise<void> {
  try {
    await db.update(contacts).set({
      totalRevenue: sql`${contacts.totalRevenue} + ${amount}`,
      lastContactAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(contacts.id, contactId))
  } catch (error) {
    console.error('[BOS] Failed to sync payment to contact:', error)
  }
}

async function findOrCreateContactFromAppointment(
  userId: string,
  appointment: {
    customerName: string
    customerEmail: string
    customerPhone: string
  }
): Promise<{ id: number }> {
  // Try email match first
  const existingByEmail = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.email, appointment.customerEmail)))
    .limit(1)
    .then(r => r[0] || null)

  if (existingByEmail) {
    return { id: existingByEmail.id }
  }

  // Try phone match
  const existingByPhone = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.phone, appointment.customerPhone)))
    .limit(1)
    .then(r => r[0] || null)

  if (existingByPhone) {
    // Update email if missing
    if (!existingByPhone.email && appointment.customerEmail) {
      await db.update(contacts).set({
        email: appointment.customerEmail,
        updatedAt: new Date(),
      }).where(eq(contacts.id, existingByPhone.id))
    }
    return { id: existingByPhone.id }
  }

  // Create new contact
  const now = new Date()
  const result = await db.insert(contacts).values({
    userId,
    name: appointment.customerName,
    email: appointment.customerEmail,
    phone: appointment.customerPhone,
    source: 'appointment',
    status: 'lead',
    firstContactAt: now,
    lastContactAt: now,
    totalAppointments: 1,
  }).returning({ id: contacts.id })

  return { id: result[0].id }
}
