import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { appointments, googleCalendars, businesses } from '@/lib/db/tables'
import { eq, and } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { appointmentId } = await request.json()
    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 })
    }

    // Get the appointment
    const aptList = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.userId, session.user.id)
        )
      )
      .limit(1)

    if (!aptList.length) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const apt = aptList[0]

    // Cancel the appointment
    await db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))

    // Fire-and-forget: Delete Google Calendar event
    if (apt.googleEventId) {
      deleteCalendarEvent(apt).catch(e =>
        console.error('[Cancel] Failed to delete calendar event:', e)
      )
    }

    // Fire-and-forget: Send SMS notification
    sendCancellationSms(apt).catch(e =>
      console.error('[Cancel] Failed to send SMS:', e)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Cancel Appointment] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function deleteCalendarEvent(apt: any) {
  const cal = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, apt.userId))
    .limit(1)

  if (!cal.length || !apt.googleEventId) return

  let accessToken = cal[0].accessToken
  if (cal[0].expiresAt && new Date(cal[0].expiresAt).getTime() < Date.now()) {
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: cal[0].refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    })
    const data = await refreshRes.json()
    accessToken = data.access_token
  }

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${cal[0].calendarId}/events/${apt.googleEventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
  )
}

async function sendCancellationSms(apt: any) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) return

  const biz = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, apt.userId))
    .limit(1)

  const bizName = biz.length > 0 ? biz[0].businessName : 'Business'
  const message = `${bizName}: Your appointment on ${apt.eventStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${apt.eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} has been cancelled. Please contact us if you have any questions.`

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        To: apt.customerPhone,
        From: fromNumber,
        Body: message,
      }).toString(),
    }
  )
}
