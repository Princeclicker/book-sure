import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, googleCalendars, businesses } from '@/lib/db/tables'
import { eq, and, gte, lte } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const body = (formData.get('Body') as string || '').trim().toUpperCase()
    const twilioNumber = formData.get('To') as string

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Check if the message is a cancellation request
    if (body !== 'CANCEL' && body !== 'STOP' && body !== 'UNSUBSCRIBE') {
      // Respond with help message
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Reply CANCEL to cancel your upcoming appointment.</Message>
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Find upcoming appointments for this phone number
    const now = new Date()
    const upcomingAppts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.customerPhone, from),
          eq(appointments.status, 'confirmed'),
          gte(appointments.eventStart, now)
        )
      )
      .orderBy(appointments.eventStart)
      .limit(1)

    if (upcomingAppts.length === 0) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have no upcoming appointments to cancel.</Message>
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const apt = upcomingAppts[0]

    // Cancel the appointment
    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        cancelledViaSms: true,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, apt.id))

    // Try to delete the Google Calendar event if it exists
    if (apt.googleEventId) {
      try {
        const cal = await db
          .select()
          .from(googleCalendars)
          .where(eq(googleCalendars.userId, apt.userId))
          .limit(1)

        if (cal.length > 0) {
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
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          )
        }
      } catch (e) {
        console.error('[Twilio] Failed to delete calendar event:', e)
      }
    }

    // Send confirmation SMS
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (accountSid && authToken && twilioNumber) {
      const biz = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, apt.userId))
        .limit(1)

      const bizName = biz.length > 0 ? biz[0].businessName : 'Business'
      const cancelMsg = `Your appointment with ${bizName} on ${apt.eventStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${apt.eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} has been cancelled.`

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            To: from,
            From: twilioNumber,
            Body: cancelMsg,
          }).toString(),
        }
      )
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Your appointment has been cancelled. We hope to see you again!</Message>
</Response>`

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('[Twilio Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
