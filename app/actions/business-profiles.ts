'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { businessProfiles } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getBusinessProfile() {
  const userId = await getUserId()
  const profile = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null)
  return profile
}

export async function createOrUpdateBusinessProfile(data: {
  profession?: string
  businessDescription?: string
  location?: string
  timezone?: string
  currency?: string
  teamSize?: number
  onboardingCompleted?: boolean
  onboardingStep?: number
  enabledModules?: string[]
}) {
  const userId = await getUserId()
  const existing = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null)

  if (existing) {
    await db.update(businessProfiles).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(businessProfiles.userId, userId))
  } else {
    await db.insert(businessProfiles).values({
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/settings')
}

export async function completeOnboarding(data: {
  profession: string
  businessDescription?: string
  location?: string
  timezone?: string
  currency?: string
  teamSize?: number
}) {
  const userId = await getUserId()
  const existing = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null)

  if (existing) {
    await db.update(businessProfiles).set({
      ...data,
      onboardingCompleted: true,
      onboardingStep: 100,
      updatedAt: new Date(),
    }).where(eq(businessProfiles.userId, userId))
  } else {
    await db.insert(businessProfiles).values({
      userId,
      ...data,
      onboardingCompleted: true,
      onboardingStep: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/onboarding')
}
