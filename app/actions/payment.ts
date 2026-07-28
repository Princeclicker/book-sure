'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function updateBusinessBrandColor(brandColor: string) {
  const userId = await getUserId()

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1)

  if (!business.length) {
    throw new Error('Business not found')
  }

  await db
    .update(businesses)
    .set({
      brandColor,
      updatedAt: new Date(),
    })
    .where(eq(businesses.userId, userId))

  return { success: true }
}
