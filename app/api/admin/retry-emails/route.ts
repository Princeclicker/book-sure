import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/tables'
import { sendConfirmationEmail } from '@/lib/email'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const rows = await db
      .select({
        id: appointments.id,
        customerName: appointments.customerName,
        customerEmail: appointments.customerEmail,
        eventStart: appointments.eventStart,
        duration: appointments.duration,
        notes: appointments.notes,
        manageToken: appointments.manageToken,
        clientToken: appointments.clientToken,
        businessName: businesses.businessName,
        businessSlug: businesses.slug,
      })
      .from(appointments)
      .innerJoin(businesses, eq(businesses.userId, appointments.userId))
      .where(
        and(
          eq(appointments.userId, userId),
          eq(appointments.status, 'confirmed'),
          or(isNull(appointments.emailSent), eq(appointments.emailSent, false))
        )
      )

    let sent = 0
    let failed = 0

    for (const row of rows) {
      const dateStr = new Date(row.eventStart).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
      const timeStr = new Date(row.eventStart).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      })

      const manageLink = row.manageToken ? `${APP_URL}/manage/${row.manageToken}` : null
      const dashLink = row.clientToken && row.businessSlug ? `${APP_URL}/client/dashboard/${row.businessSlug}/${row.clientToken}` : null

      try {
        const ok = await sendConfirmationEmail({
          to: row.customerEmail,
          customerName: row.customerName,
          businessName: row.businessName,
          date: dateStr,
          time: timeStr,
          duration: row.duration,
          manageLink,
          dashboardLink: dashLink,
          notes: row.notes,
          clientToken: row.clientToken,
        })

        if (ok) {
          await db.update(appointments).set({ emailSent: true }).where(eq(appointments.id, row.id))
          sent++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    return NextResponse.json({ sent, failed, total: rows.length })
  } catch (error) {
    console.error('[RetryEmails] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
