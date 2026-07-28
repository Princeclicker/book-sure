'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { googleCalendars, appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function connectGoogleCalendar(
  calendarId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number | Date,
  timezone: string = 'UTC',
  workingHoursStart: number = 9,
  workingHoursEnd: number = 17
) {
  const userId = await getUserId()

  const expiresAtDate = typeof expiresAt === 'number' 
    ? new Date(expiresAt) 
    : expiresAt

  // Check if calendar already connected
  const existing = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))

  if (existing.length > 0) {
    // Update existing connection
    await db
      .update(googleCalendars)
      .set({
        calendarId,
        accessToken,
        refreshToken,
        expiresAt: expiresAtDate,
        timezone,
        workingHoursStart,
        workingHoursEnd,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendars.userId, userId))

    return existing[0].id
  }

  // Create new connection
  const result = await db
    .insert(googleCalendars)
    .values({
      userId,
      calendarId,
      accessToken,
      refreshToken,
      expiresAt: expiresAtDate,
      timezone,
      workingHoursStart,
      workingHoursEnd,
    })
    .returning()

  return result[0].id
}

export async function getConnectedCalendar() {
  const userId = await getUserId()

  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  return calendar[0] || null
}

export async function updateCalendarSettings(
  workingHoursStart: number,
  workingHoursEnd: number,
  timezone: string
) {
  const userId = await getUserId()

  await db
    .update(googleCalendars)
    .set({
      workingHoursStart,
      workingHoursEnd,
      timezone,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.userId, userId))
}

export async function disconnectCalendar() {
  const userId = await getUserId()

  await db
    .delete(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
}

export async function getCalendarAppointments() {
  const userId = await getUserId()

  return db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, userId))
    .orderBy((a) => a.eventStart)
}

export async function getCalendarAppointmentsByDate(date: Date) {
  const userId = await getUserId()

  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return db
    .select()
    .from(appointments)
    .where((a) => eq(a.userId, userId))
}

// Utilities for OAuth flow
export function generateGoogleAuthUrl(clientId: string, redirectUri: string) {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleAuthCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange Google auth code')
  }

  return response.json()
}

export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Google token')
  }

  return response.json()
}
