'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { contacts, contactTimeline, appointments } from '@/lib/db/tables'
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getContacts(options?: {
  search?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const userId = await getUserId()
  const { search, status, limit = 50, offset = 0 } = options || {}

  const conditions = [eq(contacts.userId, userId)]

  if (search) {
    conditions.push(
      or(
        ilike(contacts.name, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.company, `%${search}%`)
      )!
    )
  }

  if (status) {
    conditions.push(eq(contacts.status, status))
  }

  const results = await db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.updatedAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(and(...conditions))

  return { contacts: results, total: count }
}

export async function getContact(id: number) {
  const userId = await getUserId()
  const contact = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  if (!contact) return null

  const timeline = await db
    .select()
    .from(contactTimeline)
    .where(eq(contactTimeline.contactId, id))
    .orderBy(desc(contactTimeline.createdAt))
    .limit(50)

  return { ...contact, timeline }
}

export async function createContact(data: {
  name: string
  email?: string
  phone?: string
  company?: string
  profession?: string
  tags?: string[]
  source?: string
  assignedTo?: string
  status?: string
  notes?: string
}) {
  const userId = await getUserId()
  const now = new Date()

  const result = await db.insert(contacts).values({
    userId,
    ...data,
    firstContactAt: now,
    lastContactAt: now,
  }).returning({ id: contacts.id })

  const contactId = result[0].id

  await db.insert(contactTimeline).values({
    contactId,
    userId,
    eventType: 'contact_created',
    title: 'Contact created',
    description: `New ${data.source || 'manual'} contact added`,
    metadata: { source: data.source || 'manual' },
  })

  revalidatePath('/dashboard/contacts')
  return { id: contactId }
}

export async function updateContact(id: number, data: {
  name?: string
  email?: string
  phone?: string
  company?: string
  profession?: string
  tags?: string[]
  status?: string
  assignedTo?: string
  notes?: string
}) {
  const userId = await getUserId()

  await db.update(contacts).set({
    ...data,
    updatedAt: new Date(),
  }).where(and(eq(contacts.id, id), eq(contacts.userId, userId)))

  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${id}`)
}

export async function deleteContact(id: number) {
  const userId = await getUserId()
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
  revalidatePath('/dashboard/contacts')
}

export async function findOrCreateContact(data: {
  name: string
  email?: string
  phone?: string
  source?: string
}): Promise<{ id: number; isNew: boolean }> {
  const userId = await getUserId()

  if (data.email) {
    const existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.email, data.email)))
      .limit(1)
      .then(r => r[0] || null)

    if (existing) {
      await db.update(contacts).set({
        lastContactAt: new Date(),
        totalAppointments: sql`${contacts.totalAppointments} + 1`,
        updatedAt: new Date(),
      }).where(eq(contacts.id, existing.id))

      return { id: existing.id, isNew: false }
    }
  }

  if (data.phone) {
    const existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.phone, data.phone)))
      .limit(1)
      .then(r => r[0] || null)

    if (existing) {
      await db.update(contacts).set({
        lastContactAt: new Date(),
        totalAppointments: sql`${contacts.totalAppointments} + 1`,
        updatedAt: new Date(),
      }).where(eq(contacts.id, existing.id))

      return { id: existing.id, isNew: false }
    }
  }

  const now = new Date()
  const result = await db.insert(contacts).values({
    userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    source: data.source || 'appointment',
    status: 'lead',
    firstContactAt: now,
    lastContactAt: now,
    totalAppointments: 1,
  }).returning({ id: contacts.id })

  const contactId = result[0].id

  await db.insert(contactTimeline).values({
    contactId,
    userId,
    eventType: 'contact_created',
    title: 'Contact created from appointment',
    description: `Automatically created from a ${data.source || 'booking'}`,
    metadata: { source: data.source || 'booking' },
  })

  return { id: contactId, isNew: true }
}

export async function addTimelineEvent(data: {
  contactId: number
  eventType: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
  linkedAppointmentId?: number
  linkedInvoiceId?: number
  linkedTaskId?: number
  linkedOpportunityId?: number
}) {
  const userId = await getUserId()

  await db.insert(contactTimeline).values({
    ...data,
    userId,
    metadata: data.metadata || {},
  })

  await db.update(contacts).set({
    lastContactAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(contacts.id, data.contactId))

  revalidatePath(`/dashboard/contacts/${data.contactId}`)
}
