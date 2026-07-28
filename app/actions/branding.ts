'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function updateBusinessBranding(data: {
  brandColor?: string
  logoUrl?: string
}) {
  const userId = await getUserId()

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1)

  if (!business.length) {
    throw new Error('Business not found')
  }

  const updateData: any = {
    updatedAt: new Date(),
  }

  if (data.brandColor) updateData.brandColor = data.brandColor
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl

  await db
    .update(businesses)
    .set(updateData)
    .where(eq(businesses.userId, userId))

  revalidatePath('/settings')
  revalidatePath('/book/[slug]')

  return { success: true }
}

export async function getBusinessBranding(businessSlug: string) {
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, businessSlug))
    .limit(1)

  if (!business.length) {
    return null
  }

  return {
    businessName: business[0].businessName,
    brandColor: business[0].brandColor || '#3b82f6',
    logoUrl: business[0].logoUrl,
    businessSlug: business[0].businessSlug,
  }
}

export async function getBookingPageContent(businessSlug: string) {
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, businessSlug))
    .limit(1)

  if (!business.length) {
    return null
  }

  return {
    businessName: business[0].businessName,
    businessSlug: business[0].businessSlug,
    brandColor: business[0].brandColor || '#3b82f6',
    logoUrl: business[0].logoUrl,
  }
}
