import { db } from '@/lib/db'
import { appointments, googleCalendars, user, businesses } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

const isDryRun = process.argv.includes('--dry-run')
const DELAY_MS = parseInt(process.env.BACKFILL_DELAY_MS || '1000', 10)

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// ── Token refresh (duplicated from route handler for standalone use) ──

async function getValidAccessToken(cal: any): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

  if (cal.expiresAt && new Date(cal.expiresAt).getTime() < Date.now()) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
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
      console.error('[Backfill] Token refresh failed:', e)
      return null
    }
  }
  return cal.accessToken
}

// ── Phase 1: Sync provider calendars (appointments with no googleEventId) ──

async function syncProviderCalendars(): Promise<void> {
  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      customerPhone: appointments.customerPhone,
      eventStart: appointments.eventStart,
      eventEnd: appointments.eventEnd,
      duration: appointments.duration,
    })
    .from(appointments)
    .where(
      and(
        sql`${appointments.googleEventId} IS NULL`,
        sql`${appointments.status} = 'confirmed'`
      )
    )
    .orderBy(appointments.eventStart)

  const total = rows.length
  if (total === 0) {
    console.log('  No appointments missing provider calendar events.')
    return
  }
  console.log(`  Found ${total} appointment(s) missing provider events.\n`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < total; i++) {
    const apt = rows[i]
    const idx = i + 1
    console.log(`  [${idx}/${total}] Appointment ID ${apt.id}...`)

    const calRows = await db
      .select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, apt.userId))
      .limit(1)

    if (calRows.length === 0) {
      console.log(`    └─ Skipping (no calendar connected)`)
      skipped++
      continue
    }

    const cal = calRows[0]
    const accessToken = await getValidAccessToken(cal)
    if (!accessToken) {
      console.log(`    └─ Skipping (token unavailable)`)
      skipped++
      continue
    }

    const dateStr = new Date(apt.eventStart).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const timeStr = new Date(apt.eventStart).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    if (isDryRun) {
      console.log(`    └─ Dry-run: "${dateStr} ${timeStr}" → provider calendar`)
      continue
    }

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
            summary: `Appointment with ${apt.customerName}`,
            description: [
              `Customer: ${apt.customerEmail}`,
              `Phone: ${apt.customerPhone}`,
              `Date: ${dateStr}`,
              `Time: ${timeStr}`,
              `Duration: ${apt.duration} minutes`,
            ].join('\n'),
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

      if (!eventRes.ok) {
        const body = await eventRes.text()
        console.error(`    └─ ✗ HTTP ${eventRes.status}: ${body}`)
        failed++
        await sleep(DELAY_MS)
        continue
      }

      const event = await eventRes.json()
      await db
        .update(appointments)
        .set({ googleEventId: event.id })
        .where(eq(appointments.id, apt.id))

      created++
      console.log(`    └─ ✓ Created (${event.id})`)
    } catch (e) {
      console.error(`    └─ ✗ ${e instanceof Error ? e.message : e}`)
      failed++
    }

    if (i < total - 1) await sleep(DELAY_MS)
  }

  console.log(`  → Provider sync done: ${created} created, ${skipped} skipped, ${failed} failed`)
}

// ── Phase 2: Sync client calendars (customer has a BookSure account with Google Calendar) ──

async function syncClientCalendars(): Promise<void> {
  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      customerName: appointments.customerName,
      customerEmail: appointments.customerEmail,
      eventStart: appointments.eventStart,
      eventEnd: appointments.eventEnd,
      duration: appointments.duration,
      businessName: businesses.businessName,
    })
    .from(appointments)
    .innerJoin(businesses, eq(businesses.userId, appointments.userId))
    .innerJoin(user, eq(user.email, sql`LOWER(${appointments.customerEmail})`))
    .innerJoin(googleCalendars, eq(googleCalendars.userId, user.id))
    .where(sql`${appointments.status} = 'confirmed'`)
    .orderBy(appointments.eventStart)

  const total = rows.length
  if (total === 0) {
    console.log('  No appointments found for client calendar sync.')
    return
  }
  console.log(`  Found ${total} appointment(s) where the client has a Google Calendar connected.\n`)

  let created = 0
  let failed = 0

  for (let i = 0; i < total; i++) {
    const apt = rows[i]
    const idx = i + 1
    console.log(`  [${idx}/${total}] ${apt.customerEmail} → ${apt.businessName}...`)

    const calRows = await db
      .select()
      .from(googleCalendars)
      .innerJoin(user, eq(user.id, googleCalendars.userId))
      .where(eq(user.email, apt.customerEmail))
      .limit(1)

    if (calRows.length === 0) {
      console.log(`    └─ Skipping (calendar connection not found)`)
      continue
    }

    const cal = calRows[0].google_calendars
    const accessToken = await getValidAccessToken(cal)
    if (!accessToken) {
      console.log(`    └─ Skipping (token unavailable)`)
      failed++
      continue
    }

    const dateStr = new Date(apt.eventStart).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const timeStr = new Date(apt.eventStart).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    if (isDryRun) {
      console.log(`    └─ Dry-run: "Appointment with ${apt.businessName}" — ${dateStr} ${timeStr}`)
      continue
    }

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
            summary: `Appointment with ${apt.businessName}`,
            description: [
              `You have an appointment with ${apt.businessName}`,
              `Date: ${dateStr}`,
              `Time: ${timeStr}`,
              `Duration: ${apt.duration} minutes`,
            ].join('\n'),
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

      if (!eventRes.ok) {
        const body = await eventRes.text()
        console.error(`    └─ ✗ HTTP ${eventRes.status}: ${body}`)
        failed++
        await sleep(DELAY_MS)
        continue
      }

      const event = await eventRes.json()
      console.log(`    └─ ✓ Client event created for ${apt.customerEmail} (${event.id})`)
      created++
    } catch (e) {
      console.error(`    └─ ✗ ${e instanceof Error ? e.message : e}`)
      failed++
    }

    if (i < total - 1) await sleep(DELAY_MS)
  }

  console.log(`  → Client sync done: ${created} created, ${failed} failed`)
}

// ── Main ──

async function main() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log('[Backfill] Google OAuth not configured, exiting.')
    process.exit(1)
  }

  if (isDryRun) console.log('[Backfill] DRY RUN — no events will be created.\n')

  console.log('[Backfill] Phase 1: Provider calendars')
  await syncProviderCalendars()

  console.log('')
  console.log('[Backfill] Phase 2: Client calendars')
  await syncClientCalendars()

  console.log('\n[Backfill] Done.')
  process.exit(0)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main()
