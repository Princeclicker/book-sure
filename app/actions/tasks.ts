'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { tasks, contactTimeline } from '@/lib/db/tables'
import { eq, and, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getTasks(options?: {
  status?: string
  priority?: string
  contactId?: number
  limit?: number
  offset?: number
}) {
  const userId = await getUserId()
  const { status, priority, contactId, limit = 50, offset = 0 } = options || {}

  const conditions = [eq(tasks.userId, userId)]
  if (status) conditions.push(eq(tasks.status, status))
  if (priority) conditions.push(eq(tasks.priority, priority))
  if (contactId) conditions.push(eq(tasks.contactId, contactId))

  const results = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(...conditions))

  return { tasks: results, total: count }
}

export async function getTask(id: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)
}

export async function createTask(data: {
  title: string
  description?: string
  priority?: string
  dueDate?: Date
  contactId?: number
  linkedAppointmentId?: number
  linkedInvoiceId?: number
  linkedOpportunityId?: number
}) {
  const userId = await getUserId()

  const result = await db.insert(tasks).values({
    userId,
    ...data,
  }).returning({ id: tasks.id })

  if (data.contactId) {
    await db.insert(contactTimeline).values({
      contactId: data.contactId,
      userId,
      eventType: 'task_created',
      title: `Task created: ${data.title}`,
      description: data.description,
      linkedTaskId: result[0].id,
    })
  }

  revalidatePath('/dashboard/tasks')
  return { id: result[0].id }
}

export async function updateTask(id: number, data: {
  title?: string
  description?: string
  priority?: string
  status?: string
  dueDate?: Date | null
  assignedTo?: string
}) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  await db.update(tasks).set({
    ...data,
    updatedAt: new Date(),
  }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))

  if (data.status === 'done' && existing?.status !== 'done' && existing?.contactId) {
    await db.insert(contactTimeline).values({
      contactId: existing.contactId,
      userId,
      eventType: 'task_completed',
      title: `Task completed: ${existing.title}`,
      linkedTaskId: id,
    })
  }

  revalidatePath('/dashboard/tasks')
}

export async function deleteTask(id: number) {
  const userId = await getUserId()
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
  revalidatePath('/dashboard/tasks')
}
