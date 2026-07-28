'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { googleCalendars, appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function generateGoogleOAuthURL() {
  const userId = await getUserId()
  
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  
  if (!clientId) {
    throw new Error('Google OAuth is not configured')
  }

  const scope = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function saveGoogleOAuthToken(data: {
  code: string
  googleCalendarId: string
  accessToken: string
  refreshToken: string
  expiresAt: number | Date
}) {
  const userId = await getUserId()

  const expiresAtDate = typeof data.expiresAt === 'number' 
    ? new Date(data.expiresAt) 
    : data.expiresAt

  // Check if calendar already exists
  const existing = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (existing.length > 0) {
    // Update existing
    await db
      .update(googleCalendars)
      .set({
        calendarId: data.googleCalendarId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: expiresAtDate,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendars.userId, userId))
  } else {
    // Create new
    await db.insert(googleCalendars).values({
      userId,
      calendarId: data.googleCalendarId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: expiresAtDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidatePath('/settings')
  revalidatePath('/')
}

export async function updateWorkingHours(startHour: number, endHour: number) {
  const userId = await getUserId()

  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (!calendar.length) {
    throw new Error('Calendar not connected')
  }

  await db
    .update(googleCalendars)
    .set({
      workingHoursStart: startHour,
      workingHoursEnd: endHour,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.userId, userId))

  revalidatePath('/settings')
}

export async function refreshAccessToken(userId: string) {
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (!calendar.length || !calendar[0].refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: calendar[0].refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()

    await db
      .update(googleCalendars)
      .set({
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(googleCalendars.userId, userId))

    return data.access_token
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw error
  }
}

export async function syncGoogleEvents(userId: string) {
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (!calendar.length) {
    throw new Error('Calendar not connected')
  }

  let accessToken = calendar[0].accessToken

  // Check if token is expired and refresh if needed
  if (calendar[0].expiresAt && calendar[0].expiresAt.getTime() < Date.now()) {
    accessToken = await refreshAccessToken(userId)
  }

  try {
    // Fetch events from Google Calendar (next 30 days)
    const now = Date.now()
    const thirtyDaysLater = new Date(now + 30 * 24 * 60 * 60 * 1000)

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendar[0].calendarId}/events?` +
        `timeMin=${new Date(now).toISOString()}&` +
        `timeMax=${thirtyDaysLater.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events')
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Failed to sync Google events:', error)
    throw error
  }
}

export async function createGoogleCalendarEvent(
  userId: string,
  title: string,
  description: string,
  startTime: Date,
  endTime: Date
) {
  const calendar = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, userId))
    .limit(1)

  if (!calendar.length) {
    throw new Error('Calendar not connected')
  }

  let accessToken = calendar[0].accessToken

  // Check if token is expired and refresh if needed
  if (calendar[0].expiresAt && calendar[0].expiresAt.getTime() < Date.now()) {
    accessToken = await refreshAccessToken(userId)
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendar[0].calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: title,
          description,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: calendar[0].timezone || 'UTC',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: calendar[0].timezone || 'UTC',
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to create Google Calendar event')
    }

    const event = await response.json()
    return event
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    throw error
  }
}
