import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses, googleCalendars, appointments, user } from '@/lib/db/tables'
import { eq, and, lt, gt } from 'drizzle-orm'
import crypto from 'node:crypto'
import { generateClientToken } from '@/lib/client-token'
import { verifyEmailStatus } from '@/lib/email-verification'
import { emailVerificationCodes } from '@/lib/db/tables'
import { sendBookingConfirmationEmail, sendNewBookingNotificationEmail } from '@/lib/email/service'
import { triggerWorkflows } from '@/lib/workflow/engine'
import { syncAppointmentToContact } from '@/lib/bos/appointment-bridge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessSlug, customerName, customerEmail, customerPhone, eventStart, duration, notes, verificationCode } = body

    if (!businessSlug || !customerName || !customerEmail || !customerPhone || !eventStart) {
      return NextResponse.json({ error: 'Missing required fields: businessSlug, customerName, customerEmail, customerPhone, eventStart' }, { status: 400 })
    }

    // Validate date/time is not in the past
    const startDate = new Date(eventStart)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid event start date' }, { status: 400 })
    }
    if (startDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Cannot book appointments on past dates. Please select a future date.' }, { status: 400 })
    }

    // Validate duration is a positive number
    const dur = parseInt(duration) || 30
    const allowedDurations = [15, 30, 45, 60, 90, 120]
    if (!allowedDurations.includes(dur)) {
      return NextResponse.json({ error: 'Invalid duration. Choose 15, 30, 45, 60, 90, or 120 minutes.' }, { status: 400 })
    }

    // Basic phone validation for Rwanda format
    const phoneRegex = /^\+?250\d{9}$/
    if (!phoneRegex.test(customerPhone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number. Use format: +2507XXXXXXXX' }, { status: 400 })
    }

    // Validate email (3-tier: valid → proceed, invalid → block, risky → require code)
    const emailCheck = await verifyEmailStatus(customerEmail)
    if (emailCheck.status === 'invalid') {
      return NextResponse.json({ error: emailCheck.reason }, { status: 400 })
    }

    if (emailCheck.status === 'risky') {
      if (!verificationCode) {
        return NextResponse.json({ error: emailCheck.reason, needsCode: true }, { status: 428 })
      }
      const cleanEmail = customerEmail.toLowerCase().trim()
      const now = new Date()
      const stored = await db
        .select()
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.email, cleanEmail),
            eq(emailVerificationCodes.code, verificationCode.toString()),
            eq(emailVerificationCodes.used, false as any),
            gt(emailVerificationCodes.expiresAt, now)
          )
        )
        .limit(1)

      if (!stored.length) {
        return NextResponse.json({ error: 'Invalid or expired verification code. Please request a new one.', needsCode: true }, { status: 428 })
      }

      await db.update(emailVerificationCodes)
        .set({ used: true as any })
        .where(eq(emailVerificationCodes.id, stored[0].id))
    }

    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.businessSlug, businessSlug))
      .limit(1)

    if (!business.length) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessUserId = business[0].userId

    const calendar = await db
      .select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, businessUserId))
      .limit(1)

    if (!calendar.length) {
      return NextResponse.json({ error: 'No calendar configured' }, { status: 400 })
    }

    const cal = calendar[0]
    const startTime = new Date(eventStart)
    const endTime = new Date(startTime.getTime() + dur * 60 * 1000)

    // Validate time falls within working hours
    const startHour = startTime.getHours()
    const endHour = endTime.getHours()
    const endMinutes = endTime.getMinutes()
    const whStart = cal.workingHoursStart || 9
    const whEnd = cal.workingHoursEnd || 17
    if (startHour < whStart || startHour >= whEnd || endHour > whEnd || (endHour === whEnd && endMinutes > 0)) {
      return NextResponse.json({ error: `Booking time must be within working hours (${whStart}:00–${whEnd}:00).` }, { status: 400 })
    }

    // Validate date falls on a working day
    const workingDays: number[] = (() => { try { return JSON.parse(cal.workingDays || '[1,2,3,4,5]') } catch { return [1, 2, 3, 4, 5] } })()
    if (!workingDays.includes(startTime.getDay())) {
      return NextResponse.json({ error: 'This date is not within the business\'s working days.' }, { status: 400 })
    }

    // Validate lunch break
    const lunchStart = (cal.lunchBreakStart || 12) * 60
    const lunchEnd = (cal.lunchBreakEnd || 13) * 60
    const bookingStart = startHour * 60 + startTime.getMinutes()
    const bookingEnd = bookingStart + dur
    if (bookingStart < lunchEnd && bookingEnd > lunchStart) {
      return NextResponse.json({ error: 'This time overlaps with the lunch break.' }, { status: 400 })
    }

    // Double-check slot availability (correct overlap: existingStart < newEnd AND existingEnd > newStart)
    const conflict = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, businessUserId),
          eq(appointments.status, 'confirmed'),
          lt(appointments.eventStart, endTime),
          gt(appointments.eventEnd, startTime)
        )
      )

    if (conflict.length > 0) {
      return NextResponse.json({ error: 'This time slot is already booked. Please select another time.' }, { status: 409 })
    }

    const manageToken = crypto.randomUUID()

    // Deterministic client token from email + business (scoped per business)
    const bizSlug = business[0].businessSlug
    const clientToken = customerEmail ? generateClientToken(customerEmail.toLowerCase().trim(), bizSlug) : null
    console.log('[Booking] clientToken generated:', clientToken?.substring(0, 16) + '...', 'for email:', customerEmail, 'slug:', bizSlug)

    const result = await db
      .insert(appointments)
      .values({
        userId: businessUserId,
        calendarId: calendar[0].id,
        customerName,
        customerEmail: customerEmail || '',
        customerPhone: customerPhone.replace(/\s/g, ''),
        eventStart: startTime,
        eventEnd: endTime,
        duration: dur,
        status: 'confirmed',
        notes: notes || null,
        manageToken,
        clientToken,
        confirmationSent: false,
        emailSent: false,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    const appointment = result[0]

    // Fire-and-forget: Send SMS confirmation
    sendConfirmationSms(appointment, business[0], clientToken ?? undefined).catch(e =>
      console.error('SMS confirmation failed:', e)
    )

    // Fire-and-forget: Create Google Calendar event (provider)
    createCalendarEvent(appointment, calendar[0], business[0]).catch(e =>
      console.error('[Calendar] Provider event creation failed:', e)
    )

    // Fire-and-forget: Create Google Calendar event (client, if they have an account)
    createClientCalendarEvent(appointment, customerEmail).catch(e =>
      console.error('[Calendar] Client event creation failed:', e)
    )

    // Check if the customer is a business owner (has a registered business)
    const businessOwner = await db
      .select({ id: businesses.id })
      .from(businesses)
      .innerJoin(user, eq(businesses.userId, user.id))
      .where(eq(user.email, customerEmail.toLowerCase().trim()))
      .limit(1)
    const isBusinessOwner = businessOwner.length > 0

    // Fire-and-forget: Send email confirmation via centralized service
    sendBookingConfirmationEmail(
      {
        id: appointment.id,
        userId: appointment.userId,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        eventStart: appointment.eventStart,
        duration: appointment.duration,
        notes: appointment.notes,
        manageToken: appointment.manageToken,
        clientToken: appointment.clientToken,
      },
      {
        businessName: business[0].businessName,
        businessSlug: bizSlug,
      },
      isBusinessOwner
    ).catch(e => console.error('[Email] Confirmation email failed:', e))

    // Fire-and-forget: Send notification to business owner
    const ownerUser = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, businessUserId))
      .limit(1)

    if (ownerUser.length > 0 && ownerUser[0].email) {
      const ownerEmail = ownerUser[0].email
      if (ownerEmail.toLowerCase().trim() !== customerEmail.toLowerCase().trim()) {
        sendNewBookingNotificationEmail(
          {
            id: appointment.id,
            userId: appointment.userId,
            customerName: appointment.customerName,
            customerEmail: appointment.customerEmail,
            eventStart: appointment.eventStart,
            duration: appointment.duration,
            notes: appointment.notes,
            manageToken: appointment.manageToken,
            serviceName: business[0].businessName,
          },
          {
            businessName: business[0].businessName,
            businessSlug: bizSlug,
          },
          ownerEmail
        ).catch(e => console.error('[Email] Owner notification email failed:', e))
      }
    }

    // Fire-and-forget: trigger workflows for booking
    triggerWorkflows('booking_confirmed', {
      id: appointment.id,
      userId: appointment.userId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      eventStart: appointment.eventStart,
      eventEnd: appointment.eventEnd,
      duration: appointment.duration,
      status: appointment.status || 'confirmed',
      notes: appointment.notes,
      manageToken: appointment.manageToken,
    }).catch(e => console.error('[Workflow] Trigger failed:', e))

    // Fire-and-forget: Sync to BOS CRM contact
    syncAppointmentToContact(businessUserId, {
      id: appointment.id,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      eventStart: appointment.eventStart,
      duration: appointment.duration,
      status: appointment.status || 'confirmed',
    }).catch(() => {})

    return NextResponse.json({ success: true, appointment, manageToken, clientToken, isBusinessOwner, businessSlug }, { status: 201 })
  } catch (error) {
    console.error('Failed to create appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendConfirmationSms(apt: any, biz: any, clientToken?: string) {
  const smsSenderName = biz.smsSenderName || biz.businessName
  const dateTime = new Date(apt.eventStart).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const manageLink = apt.manageToken ? `${baseUrl}/manage/${apt.manageToken}` : null
  const dashboardLink = clientToken ? `${baseUrl}/client/dashboard/${biz.businessSlug}/${clientToken}` : null
  const message = `${smsSenderName}: Your appointment is confirmed for ${dateTime}.${manageLink ? ` Manage: ${manageLink}` : ''}${dashboardLink ? ` | My appointments: ${dashboardLink}` : ''}`

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.log('[SMS] Twilio not configured, skipping SMS. Would send:', message)
      return
    }

    const response = await fetch(
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

    if (response.ok) {
      await db.update(appointments)
        .set({ confirmationSent: true })
        .where(eq(appointments.id, apt.id))
    } else {
      const errText = await response.text()
      console.error('[SMS] Twilio error:', errText)
    }
  } catch (error) {
    console.error('[SMS] Failed to send confirmation:', error)
  }
}

async function getValidAccessToken(cal: any): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (cal.expiresAt && new Date(cal.expiresAt).getTime() < Date.now()) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: cal.refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      })
      const refreshData = await refreshRes.json()
      await db.update(googleCalendars)
        .set({
          accessToken: refreshData.access_token,
          expiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
        })
        .where(eq(googleCalendars.id, cal.id))
      return refreshData.access_token
    } catch (e) {
      console.error('[Calendar] Token refresh failed:', e)
      return null
    }
  }
  return cal.accessToken
}

async function createCalendarEvent(apt: any, cal: any, biz: any) {
  const accessToken = await getValidAccessToken(cal)
  if (!accessToken) return

  try {
    const eventRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${cal.calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `${biz.businessName} - ${apt.customerName}`,
          description: `Phone: ${apt.customerPhone}\nEmail: ${apt.customerEmail}\nNotes: ${apt.notes || ''}`,
          start: {
            dateTime: new Date(apt.eventStart).toISOString(),
            timeZone: cal.timezone || 'UTC',
          },
          end: {
            dateTime: new Date(apt.eventEnd).toISOString(),
            timeZone: cal.timezone || 'UTC',
          },
        }),
      }
    )

    if (eventRes.ok) {
      const event = await eventRes.json()
      await db.update(appointments)
        .set({ googleEventId: event.id })
        .where(eq(appointments.id, apt.id))
    }
  } catch (e) {
    console.error('[Calendar] Failed to create provider event:', e)
  }
}

async function createClientCalendarEvent(apt: any, customerEmail: string) {
  if (!customerEmail) return

  const clientUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, customerEmail.toLowerCase().trim()))
    .limit(1)

  if (clientUser.length === 0) return

  const clientCal = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, clientUser[0].id))
    .limit(1)

  if (clientCal.length === 0) return

  const accessToken = await getValidAccessToken(clientCal[0])
  if (!accessToken) return

  try {
    const dateStr = new Date(apt.eventStart).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const timeStr = new Date(apt.eventStart).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    const eventRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${clientCal[0].calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `Appointment with ${apt.customerName}`,
          description: `Booking details: ${dateStr}, ${timeStr}, ${apt.duration} minutes`,
          start: {
            dateTime: new Date(apt.eventStart).toISOString(),
            timeZone: clientCal[0].timezone || 'UTC',
          },
          end: {
            dateTime: new Date(apt.eventEnd).toISOString(),
            timeZone: clientCal[0].timezone || 'UTC',
          },
        }),
      }
    )

    if (!eventRes.ok) {
      const body = await eventRes.text()
      console.error('[Calendar] Client event creation failed:', eventRes.status, body)
    }
  } catch (e) {
    console.error('[Calendar] Failed to create client event:', e)
  }
}
