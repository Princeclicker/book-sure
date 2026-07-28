'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { opportunities, contactTimeline } from '@/lib/db/tables'
import { eq, and, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getOpportunities(options?: {
  stage?: string
  contactId?: number
  limit?: number
  offset?: number
}) {
  const userId = await getUserId()
  const { stage, contactId, limit = 50, offset = 0 } = options || {}

  const conditions = [eq(opportunities.userId, userId)]
  if (stage) conditions.push(eq(opportunities.stage, stage))
  if (contactId) conditions.push(eq(opportunities.contactId, contactId))

  const results = await db
    .select()
    .from(opportunities)
    .where(and(...conditions))
    .orderBy(desc(opportunities.updatedAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(opportunities)
    .where(and(...conditions))

  const [{ totalValue }] = await db
    .select({ totalValue: sql<number>`coalesce(sum(${opportunities.value}), 0)` })
    .from(opportunities)
    .where(and(...conditions))

  return { opportunities: results, total: count, totalValue }
}

export async function getOpportunity(id: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)
}

export async function createOpportunity(data: {
  title: string
  description?: string
  value?: number
  currency?: string
  contactId?: number
  stage?: string
  probability?: number
  expectedCloseDate?: Date
  tags?: string[]
}) {
  const userId = await getUserId()

  const result = await db.insert(opportunities).values({
    userId,
    ...data,
  }).returning({ id: opportunities.id })

  if (data.contactId) {
    await db.insert(contactTimeline).values({
      contactId: data.contactId,
      userId,
      eventType: 'opportunity_created',
      title: `Opportunity created: ${data.title}`,
      description: data.description,
      linkedOpportunityId: result[0].id,
      metadata: { value: data.value, stage: data.stage || 'lead' },
    })
  }

  revalidatePath('/dashboard/opportunities')
  return { id: result[0].id }
}

export async function updateOpportunity(id: number, data: {
  title?: string
  description?: string
  value?: number
  stage?: string
  probability?: number
  expectedCloseDate?: Date | null
  actualCloseDate?: Date | null
  lostReason?: string
  assignedTo?: string
  tags?: string[]
}) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  await db.update(opportunities).set({
    ...data,
    updatedAt: new Date(),
  }).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)))

  if (existing?.contactId) {
    if (data.stage === 'won' && existing.stage !== 'won') {
      await db.insert(contactTimeline).values({
        contactId: existing.contactId,
        userId,
        eventType: 'opportunity_won',
        title: `Opportunity won: ${existing.title}`,
        linkedOpportunityId: id,
        metadata: { value: data.value || existing.value },
      })
    } else if (data.stage === 'lost' && existing.stage !== 'lost') {
      await db.insert(contactTimeline).values({
        contactId: existing.contactId,
        userId,
        eventType: 'opportunity_lost',
        title: `Opportunity lost: ${existing.title}`,
        description: data.lostReason,
        linkedOpportunityId: id,
      })
    } else {
      await db.insert(contactTimeline).values({
        contactId: existing.contactId,
        userId,
        eventType: 'opportunity_updated',
        title: `Opportunity updated: ${existing.title}`,
        linkedOpportunityId: id,
        metadata: { stage: data.stage },
      })
    }
  }

  revalidatePath('/dashboard/opportunities')
}

export async function deleteOpportunity(id: number) {
  const userId = await getUserId()
  await db.delete(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.userId, userId)))
  revalidatePath('/dashboard/opportunities')
}
