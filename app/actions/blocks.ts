'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { manualBlocks } from '@/lib/db/tables'
import { eq, and, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function createTimeBlock(
  calendarId: number,
  blockStart: Date,
  blockEnd: Date,
  reason?: string
) {
  const userId = await getUserId()

  const result = await db
    .insert(manualBlocks)
    .values({
      userId,
      calendarId,
      blockStart,
      blockEnd,
      reason: reason || null,
    })
    .returning()

  revalidatePath('/settings')
  return result[0]
}

export async function getTimeBlocks() {
  const userId = await getUserId()

  const blocks = await db
    .select()
    .from(manualBlocks)
    .where(and(
      eq(manualBlocks.userId, userId),
      gte(manualBlocks.blockEnd, new Date())
    ))
    .orderBy(manualBlocks.blockStart)

  return blocks
}

export async function deleteTimeBlock(blockId: number) {
  const userId = await getUserId()

  await db
    .delete(manualBlocks)
    .where(and(
      eq(manualBlocks.id, blockId),
      eq(manualBlocks.userId, userId)
    ))

  revalidatePath('/settings')
}

export async function deletePastBlocks() {
  const userId = await getUserId()

  await db
    .delete(manualBlocks)
    .where(and(
      eq(manualBlocks.userId, userId),
      lte(manualBlocks.blockEnd, new Date())
    ))
}
