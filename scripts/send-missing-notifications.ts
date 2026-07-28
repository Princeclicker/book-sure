import { db } from '@/lib/db'
import { appointments, businesses, user } from '@/lib/db/tables'
import { sendBookingConfirmationEmail, sendNewBookingNotificationEmail } from '@/lib/email/service'
import { eq, and, sql, ne } from 'drizzle-orm'

const isDryRun = process.argv.includes('--dry-run')
const DELAY_MS = parseInt(process.env.SEND_DELAY_MS || '2000', 10)

async function main() {
  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      eventStart: appointments.eventStart,
      duration: appointments.duration,
      notes: appointments.notes,
      manageToken: appointments.manageToken,
      clientToken: appointments.clientToken,
      status: appointments.status,
      emailSent: appointments.emailSent,
      newBookingNotificationSent: appointments.newBookingNotificationSent,
      businessName: businesses.businessName,
      businessSlug: businesses.businessSlug,
      ownerEmail: user.email,
    })
    .from(appointments)
    .innerJoin(businesses, eq(businesses.userId, appointments.userId))
    .innerJoin(user, eq(user.id, appointments.userId))
    .where(
      sql`(${appointments.emailSent} IS NULL OR ${appointments.emailSent} = false)
         OR (${appointments.newBookingNotificationSent} IS NULL OR ${appointments.newBookingNotificationSent} = false)`
    )
    .orderBy(appointments.eventStart)

  const total = rows.length
  if (total === 0) {
    console.log('All appointments already have both notifications sent.')
    process.exit(0)
  }

  console.log(`Found ${total} appointment(s) with missing notifications.\n`)

  let customerSent = 0
  let ownerSent = 0
  let customerFailed = 0
  let ownerFailed = 0
  let skipped = 0

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const idx = i + 1
    const needsCustomerEmail = !row.emailSent
    const needsOwnerNotification = !row.newBookingNotificationSent

    const dateStr = new Date(row.eventStart).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const timeStr = new Date(row.eventStart).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    console.log(`[${idx}/${total}] Appointment #${row.id} — ${row.customerName} (${dateStr} ${timeStr})`)

    if (isDryRun) {
      if (needsCustomerEmail) console.log(`  └─ Dry-run: would send booking confirmation to ${row.customerEmail}`)
      if (needsOwnerNotification) console.log(`  └─ Dry-run: would send new booking notification to ${row.ownerEmail}`)
      if (!needsCustomerEmail && !needsOwnerNotification) skipped++
      continue
    }

    // Send customer confirmation email if missing
    if (needsCustomerEmail) {
      const manageLink = row.manageToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage/${row.manageToken}` : null
      const dashLink = row.clientToken && row.businessSlug
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/dashboard/${row.businessSlug}/${row.clientToken}`
        : null

      try {
        const ok = await sendBookingConfirmationEmail(
          {
            id: row.id,
            userId: row.userId,
            customerName: row.customerName,
            customerEmail: row.customerEmail,
            eventStart: row.eventStart,
            duration: row.duration,
            notes: row.notes,
            manageToken: row.manageToken,
            clientToken: row.clientToken,
          },
          {
            businessName: row.businessName,
            businessSlug: row.businessSlug,
          },
          false
        )

        if (ok) {
          customerSent++
          console.log(`  └─ ✓ Customer confirmation sent to ${row.customerEmail}`)
        } else {
          customerFailed++
          console.error(`  └─ ✗ Customer confirmation failed for ${row.customerEmail}`)
        }
      } catch (err) {
        customerFailed++
        console.error(`  └─ ✗ Customer confirmation error: ${err instanceof Error ? err.message : err}`)
      }
    }

    // Send business owner notification if missing and emails differ
    if (needsOwnerNotification && row.ownerEmail) {
      const ownerEmail = row.ownerEmail.toLowerCase().trim()
      const custEmail = row.customerEmail.toLowerCase().trim()

      if (ownerEmail !== custEmail) {
        const dashboardLink = row.manageToken
          ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/manage/${row.manageToken}`
          : null

        try {
          const ok = await sendNewBookingNotificationEmail(
            {
              id: row.id,
              userId: row.userId,
              customerName: row.customerName,
              customerEmail: row.customerEmail,
              eventStart: row.eventStart,
              duration: row.duration,
              notes: row.notes,
              manageToken: row.manageToken,
              staffName: null,
              serviceName: row.businessName,
            },
            {
              businessName: row.businessName,
              businessSlug: row.businessSlug,
            },
            row.ownerEmail
          )

          if (ok) {
            ownerSent++
            console.log(`  └─ ✓ Owner notification sent to ${row.ownerEmail}`)
          } else {
            ownerFailed++
            console.error(`  └─ ✗ Owner notification failed for ${row.ownerEmail}`)
          }
        } catch (err) {
          ownerFailed++
          console.error(`  └─ ✗ Owner notification error: ${err instanceof Error ? err.message : err}`)
        }
      } else {
        console.log(`  └─ Skipped owner notification (same email as customer)`)
      }
    }

    if (i < total - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nDone.`)
  console.log(`  Customer confirmations — Sent: ${customerSent}, Failed: ${customerFailed}`)
  console.log(`  Owner notifications    — Sent: ${ownerSent}, Failed: ${ownerFailed}`)
  process.exit(customerFailed > 0 || ownerFailed > 0 ? 1 : 0)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main()
