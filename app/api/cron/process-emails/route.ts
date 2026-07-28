import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { and, eq, gte, lte, isNull, or } from 'drizzle-orm'
import {
  sendReminderEmail,
  sendThankYouEmail,
  sendFeedbackRequestEmail,
} from '@/lib/email/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const WINDOW_MINUTES = 5

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = {
    timestamp: now.toISOString(),
    reminder24h: { found: 0, sent: 0, failed: 0 },
    reminder1h: { found: 0, sent: 0, failed: 0 },
    thankYou: { found: 0, sent: 0, failed: 0 },
    feedback: { found: 0, sent: 0, failed: 0 },
  }

  // ── 24-hour reminder ──────────────────────────────────────────────────────
  // Find confirmed appointments starting in ~23h55m to 24h05m
  const in24hStart = new Date(now.getTime() + (24 * 60 - WINDOW_MINUTES) * 60 * 1000)
  const in24hEnd = new Date(now.getTime() + (24 * 60 + WINDOW_MINUTES) * 60 * 1000)

  const reminder24hAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        eq(appointments.reminder24hEmailSent, false),
        eq(appointments.unsubscribed, false),
        gte(appointments.eventStart, in24hStart),
        lte(appointments.eventStart, in24hEnd)
      )
    )

  results.reminder24h.found = reminder24hAppts.length
  for (const apt of reminder24hAppts) {
    const biz = await getBusiness(apt.userId)
    if (!biz) { results.reminder24h.failed++; continue }
    const sent = await sendReminderEmail(apt, biz, 'reminder_24h')
    sent ? results.reminder24h.sent++ : results.reminder24h.failed++
  }

  // ── 1-hour reminder ───────────────────────────────────────────────────────
  const in1hStart = new Date(now.getTime() + (60 - WINDOW_MINUTES) * 60 * 1000)
  const in1hEnd = new Date(now.getTime() + (60 + WINDOW_MINUTES) * 60 * 1000)

  const reminder1hAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        eq(appointments.reminder1hEmailSent, false),
        eq(appointments.unsubscribed, false),
        gte(appointments.eventStart, in1hStart),
        lte(appointments.eventStart, in1hEnd)
      )
    )

  results.reminder1h.found = reminder1hAppts.length
  for (const apt of reminder1hAppts) {
    const biz = await getBusiness(apt.userId)
    if (!biz) { results.reminder1h.failed++; continue }
    const sent = await sendReminderEmail(apt, biz, 'reminder_1h')
    sent ? results.reminder1h.sent++ : results.reminder1h.failed++
  }

  // ── Thank-you email ───────────────────────────────────────────────────────
  // Send within 5 minutes after appointment ends
  const thankYouStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000)
  const thankYouEnd = new Date(now.getTime())

  const completedAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        eq(appointments.thankYouEmailSent, false),
        eq(appointments.unsubscribed, false),
        gte(appointments.eventEnd, thankYouStart),
        lte(appointments.eventEnd, thankYouEnd)
      )
    )

  results.thankYou.found = completedAppts.length
  for (const apt of completedAppts) {
    const biz = await getBusiness(apt.userId)
    if (!biz) { results.thankYou.failed++; continue }
    const sent = await sendThankYouEmail(apt, biz)
    sent ? results.thankYou.sent++ : results.thankYou.failed++
  }

  // ── Feedback request ──────────────────────────────────────────────────────
  // Send 24h after appointment ends
  const feedbackStart = new Date(now.getTime() - (24 * 60 + WINDOW_MINUTES) * 60 * 1000)
  const feedbackEnd = new Date(now.getTime() - (24 * 60 - WINDOW_MINUTES) * 60 * 1000)

  const feedbackAppts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        eq(appointments.feedbackEmailSent, false),
        eq(appointments.unsubscribed, false),
        gte(appointments.eventEnd, feedbackStart),
        lte(appointments.eventEnd, feedbackEnd)
      )
    )

  results.feedback.found = feedbackAppts.length
  for (const apt of feedbackAppts) {
    const biz = await getBusiness(apt.userId)
    if (!biz) { results.feedback.failed++; continue }
    const sent = await sendFeedbackRequestEmail(apt, biz)
    sent ? results.feedback.sent++ : results.feedback.failed++
  }

  const totalSent = results.reminder24h.sent + results.reminder1h.sent + results.thankYou.sent + results.feedback.sent
  const totalFailed = results.reminder24h.failed + results.reminder1h.failed + results.thankYou.failed + results.feedback.failed

  console.log(`[EmailCron] Processed: ${totalSent} sent, ${totalFailed} failed`, results)

  return NextResponse.json({
    success: true,
    ...results,
    summary: { totalSent, totalFailed },
  })
}

async function getBusiness(userId: string) {
  const biz = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, userId))
    .limit(1)
  return biz.length > 0 ? biz[0] : null
}
