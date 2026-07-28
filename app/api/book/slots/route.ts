import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses, googleCalendars, appointments, manualBlocks } from '@/lib/db/tables'
import { eq, and, gte, lte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessSlug = searchParams.get('businessSlug')
  const dateStr = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') || '30')

  if (!businessSlug || !dateStr) {
    return NextResponse.json({ error: 'Missing required parameters: businessSlug, date' }, { status: 400 })
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  try {
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.businessSlug, businessSlug))
      .limit(1)

    if (!business.length) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = business[0].userId

    const calendar = await db
      .select()
      .from(googleCalendars)
      .where(eq(googleCalendars.userId, businessId))
      .limit(1)

    if (!calendar.length) {
      return NextResponse.json({ error: 'No calendar configured', slots: [] })
    }

    const cal = calendar[0]
    const startHour = cal.workingHoursStart || 9
    const endHour = cal.workingHoursEnd || 17
    const bufferMinutes = cal.bufferMinutes || 15

    const startOfDay = new Date(date)
    startOfDay.setHours(startHour, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(endHour, 0, 0, 0)

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.userId, businessId),
          eq(appointments.status, 'confirmed'),
          gte(appointments.eventStart, startOfDay),
          lte(appointments.eventEnd, endOfDay)
        )
      )

    const blockedTimes = await db
      .select()
      .from(manualBlocks)
      .where(
        and(
          eq(manualBlocks.userId, businessId),
          gte(manualBlocks.blockStart, startOfDay),
          lte(manualBlocks.blockEnd, endOfDay)
        )
      )

    const slots: string[] = []
    const slotDurationMs = duration * 60 * 1000

    const now = new Date()

    for (
      let current = new Date(startOfDay);
      current.getTime() + slotDurationMs <= endOfDay.getTime();
      current = new Date(current.getTime() + slotDurationMs)
    ) {
      // Skip slots that have already passed (for today)
      if (current.getTime() <= now.getTime()) continue

      const slotEnd = new Date(current.getTime() + slotDurationMs)
      const slotEndWithBuffer = new Date(slotEnd.getTime() + bufferMinutes * 60 * 1000)
      const slotStartWithBuffer = new Date(current.getTime() - bufferMinutes * 60 * 1000)

      const hasConflict = existingAppointments.some(
        a => current < a.eventEnd && slotEnd > a.eventStart
      )

      const hasBlock = blockedTimes.some(
        b => current < b.blockEnd && slotEnd > b.blockStart
      )

      if (!hasConflict && !hasBlock) {
        slots.push(current.toISOString())
      }
    }

    return NextResponse.json({ slots })
  } catch (error) {
    console.error('Failed to get slots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
