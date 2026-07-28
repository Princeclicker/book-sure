import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { googleCalendars } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const existing = await db
      .select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, userId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json({ error: 'No calendar connection found' }, { status: 404 })
    }

    const cal = existing[0]

    // Revoke Google OAuth token (fire-and-forget — best effort)
    if (cal.accessToken) {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${cal.accessToken}`, { method: 'POST' }).catch(() => {})
    }

    await db.delete(googleCalendars).where(eq(googleCalendars.userId, userId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DisconnectCalendar] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
