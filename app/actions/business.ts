'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businesses, googleCalendars } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
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

export async function createOrUpdateBusiness(data: {
  businessName: string
  businessSlug: string
  logoUrl?: string
  brandColor?: string
}) {
  const userId = await getUserId()

  const existing = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1)

  const clean = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  ) as { businessName: string; businessSlug: string; logoUrl?: string; brandColor?: string }

  if (existing.length > 0) {
    // If slug changed, check no other user has it
    if (data.businessSlug && data.businessSlug !== existing[0].businessSlug) {
      const allWithSlug = await db
        .select()
        .from(businesses)
        .where(eq(businesses.businessSlug, data.businessSlug))

      if (allWithSlug.some(b => b.userId !== userId)) {
        throw new Error('This booking URL slug is already taken. Please choose another.')
      }
    }

    await db
      .update(businesses)
      .set({
        ...clean,
        updatedAt: new Date(),
      })
      .where(eq(businesses.userId, userId))
  } else {
    // Check slug uniqueness for new businesses
    const slugExists = await db
      .select()
      .from(businesses)
      .where(eq(businesses.businessSlug, data.businessSlug))
      .limit(1)

    if (slugExists.length > 0) {
      throw new Error('This booking URL slug is already taken. Please choose another.')
    }

    await db.insert(businesses).values({
      userId,
      ...clean,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
  }

  revalidatePath('/settings')
}

export async function getGoogleCalendar() {
  const userId = await getUserId()
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)
  return calendar[0] || null
}

export async function saveGoogleCalendarToken(data: {
  calendarId: string
  accessToken: string
  refreshToken: string
  expiresAt: number | Date
  timezone?: string
  workingHoursStart?: number
  workingHoursEnd?: number
}) {
  const userId = await getUserId()

  const expiresAtDate = typeof data.expiresAt === 'number' 
    ? new Date(data.expiresAt) 
    : data.expiresAt

  const existing = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(googleCalendars)
      .set({
        calendarId: data.calendarId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: expiresAtDate,
        timezone: data.timezone,
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendars.userId, userId))
  } else {
    await db.insert(googleCalendars).values({
      userId,
      calendarId: data.calendarId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: expiresAtDate,
      timezone: data.timezone,
      workingHoursStart: data.workingHoursStart,
      workingHoursEnd: data.workingHoursEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidatePath('/settings')
  revalidatePath('/')
}

export async function updateWorkingHours(
  workingHoursStart: number,
  workingHoursEnd: number
) {
  const userId = await getUserId()

  await db
    .update(googleCalendars)
    .set({
      workingHoursStart,
      workingHoursEnd,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.userId, userId))
}

export async function updateCalendarSettings(data: {
  workingHoursStart: number
  workingHoursEnd: number
  workingDays: number[]
  bufferMinutes: number
  lunchBreakStart: number
  lunchBreakEnd: number
}) {
  const userId = await getUserId()

  await db
    .update(googleCalendars)
    .set({
      workingHoursStart: data.workingHoursStart,
      workingHoursEnd: data.workingHoursEnd,
      workingDays: JSON.stringify(data.workingDays),
      bufferMinutes: data.bufferMinutes,
      lunchBreakStart: data.lunchBreakStart,
      lunchBreakEnd: data.lunchBreakEnd,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.userId, userId))

  revalidatePath('/settings')
}

export async function disconnectCalendar() {
  const userId = await getUserId()

  await db.delete(googleCalendars).where(eq(googleCalendars.userId, userId))

  revalidatePath('/settings')
  revalidatePath('/')
}
