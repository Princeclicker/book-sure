import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, googleCalendars, businesses } from '@/lib/db/tables'
import { and, eq, gte, lte } from 'drizzle-orm'
import { sendReminderEmail } from '@/lib/email/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  try {
    const now = new Date()
    // Find appointments starting in 60-70 minutes that haven't had reminders sent
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    const inOneHourTen = new Date(now.getTime() + 70 * 60 * 1000)

    const upcomingAppts = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'confirmed'),
          eq(appointments.reminderSent, false),
          gte(appointments.eventStart, inOneHour),
          lte(appointments.eventStart, inOneHourTen)
        )
      )

    let smsSent = 0
    let emailSent = 0
    let skipped = 0

    for (const apt of upcomingAppts) {
      try {
        const biz = await db
          .select()
          .from(businesses)
          .where(eq(businesses.userId, apt.userId))
          .limit(1)

        const bizName = biz.length > 0
          ? (biz[0].smsSenderName || biz[0].businessName)
          : 'Business'

        // Send SMS reminder (existing logic)
        const time = new Date(apt.eventStart).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
        const date = new Date(apt.eventStart).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })

        const message = `${bizName}: Reminder! Your appointment is in 1 hour at ${time} on ${date}. Reply CANCEL to cancel.`

        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_PHONE_NUMBER

        if (accountSid && authToken && fromNumber) {
          const smsRes = await fetch(
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

          if (smsRes.ok) {
            await db
              .update(appointments)
              .set({ reminderSent: true, updatedAt: new Date() })
              .where(eq(appointments.id, apt.id))
            smsSent++
          } else {
            console.error('[Reminder] Failed to send SMS for appointment', apt.id)
          }
        } else {
          console.log('[Reminder] Twilio not configured. Would send:', message)
        }

        // Send 1-hour email reminder (if not already sent)
        if (biz.length > 0 && !apt.reminder1hEmailSent && !apt.unsubscribed) {
          const sent = await sendReminderEmail(apt, biz[0], 'reminder_1h')
          sent ? emailSent++ : skipped++
        }
      } catch (e) {
        skipped++
        console.error('[Reminder] Error for appointment', apt.id, e)
      }
    }

    return NextResponse.json({
      success: true,
      processed: upcomingAppts.length,
      smsSent,
      emailSent,
      skipped,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Reminder Cron] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
