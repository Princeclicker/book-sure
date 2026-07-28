import { db } from '@/lib/db'
import { appointments, businesses } from '@/lib/db/schema'
import { sendConfirmationEmail } from '@/lib/email'
import { eq, and, sql } from 'drizzle-orm'

const isDryRun = process.argv.includes('--dry-run')
const DELAY_MS = parseInt(process.env.SEND_DELAY_MS || '2000', 10)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function main() {
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
      businessSlug: businesses.businessSlug,
    })
    .from(appointments)
    .innerJoin(businesses, eq(businesses.userId, appointments.userId))
    .where(
      and(
        eq(appointments.status, 'confirmed'),
        sql`(${appointments.emailSent} IS NULL OR ${appointments.emailSent} = false)`
      )
    )
    .orderBy(appointments.eventStart)

  const total = rows.length
  if (total === 0) {
    console.log('No appointments found that need confirmation emails.')
    process.exit(0)
  }

  console.log(`Found ${total} appointment(s) missing email confirmation.\n`)

  let sent = 0
  let failed = 0

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const idx = i + 1

    const dateStr = new Date(row.eventStart).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const timeStr = new Date(row.eventStart).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    const manageLink = row.manageToken ? `${APP_URL}/manage/${row.manageToken}` : null
    const dashLink = row.clientToken && row.businessSlug ? `${APP_URL}/client/dashboard/${row.businessSlug}/${row.clientToken}` : null

    console.log(`[${idx}/${total}] Sending to ${row.customerEmail}...`)

    if (isDryRun) {
      console.log(`  └─ Dry-run: would send "${row.businessName}" – ${dateStr} ${timeStr}`)
      continue
    }

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

      if (!ok) {
        failed++
        console.error(`  └─ ✗ Failed (SMTP error)`)
        continue
      }

      await db
        .update(appointments)
        .set({ emailSent: true })
        .where(eq(appointments.id, row.id))

      sent++
      console.log(`  └─ ✓ Sent`)

      if (i < total - 1) {
        await sleep(DELAY_MS)
      }
    } catch (err) {
      failed++
      console.error(`  └─ ✗ Failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main()
