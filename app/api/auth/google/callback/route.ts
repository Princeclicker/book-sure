import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { googleCalendars } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // Handle OAuth errors
  if (oauthError) {
    console.error('OAuth error:', oauthError)
    return NextResponse.redirect(new URL('/settings?error=google_auth_failed', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=missing_oauth_params', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { access_token, refresh_token, expires_in } = await tokenResponse.json()

    // Get calendar info
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const body = await calendarResponse.text()
      console.error('[Calendar] Failed to fetch primary calendar:', calendarResponse.status, body)
      throw new Error(`Failed to get calendar info: ${calendarResponse.status}`)
    }

    const calendarData = await calendarResponse.json()

    // The state parameter contains the userId (set by url/route.ts)
    const userId = state

    // Check if calendar already exists for this user
    const existing = await db
      .select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, userId))
      .limit(1)

    const expiresAtDate = new Date(Date.now() + expires_in * 1000)

    if (existing.length > 0) {
      await db
        .update(googleCalendars)
        .set({
          calendarId: calendarData.id,
          accessToken: access_token,
          refreshToken: refresh_token || '',
          expiresAt: expiresAtDate,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendars.userId, userId))
    } else {
      await db.insert(googleCalendars).values({
        userId,
        calendarId: calendarData.id,
        accessToken: access_token,
        refreshToken: refresh_token || '',
        expiresAt: expiresAtDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    revalidatePath('/settings')
    revalidatePath('/')

    return NextResponse.redirect(new URL('/settings?calendar_connected=true', request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_callback_failed', request.url))
  }
}
