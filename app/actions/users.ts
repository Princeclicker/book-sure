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

export async function createBusiness(
  businessName: string,
  businessSlug: string,
  brandColor: string = '#000000'
) {
  const userId = await getUserId()

  // Check if slug already exists
  const existing = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, businessSlug))

  if (existing.length > 0) {
    throw new Error('Business slug already exists')
  }

  const result = await db
    .insert(businesses)
    .values({
      userId,
      businessName,
      businessSlug,
      brandColor,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return result[0]
}

export async function getBusiness() {
  const userId = await getUserId()

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1)

  return business[0] || null
}

export async function updateBusiness(
  businessName?: string,
  brandColor?: string,
  logoUrl?: string
) {
  const userId = await getUserId()

  const updates: Record<string, any> = {}
  if (businessName) updates.businessName = businessName
  if (brandColor) updates.brandColor = brandColor
  if (logoUrl) updates.logoUrl = logoUrl
  if (Object.keys(updates).length === 0) return

  await db
    .update(businesses)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(businesses.userId, userId))
}


