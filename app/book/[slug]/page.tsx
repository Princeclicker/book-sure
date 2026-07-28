import { db } from '@/lib/db'
import { businesses, googleCalendars } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { BookingForm } from '@/components/booking-form'
import { notFound } from 'next/navigation'

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const businessList = await db
    .select()
    .from(businesses)
    .where(eq(businesses.businessSlug, slug))
    .limit(1)

  if (!businessList.length) {
    notFound()
  }

  const business = businessList[0]

  const calendarList = await db
    .select()
    .from(googleCalendars)
    .where(eq(googleCalendars.userId, business.userId))
    .limit(1)

  const calendar = calendarList[0]

  if (!calendar) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{business.businessName}</h1>
          <p className="text-muted-foreground mb-6">
            Calendar integration is not yet configured. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.businessName}
              className="h-14 mx-auto mb-4 object-contain"
            />
          )}
          <h1
            className="text-2xl font-bold"
            style={{ color: business.brandColor || 'inherit' }}
          >
            {business.businessName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Book an appointment</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <BookingForm
            slug={slug}
            timezone={calendar.timezone || 'UTC'}
            workingHoursStart={calendar.workingHoursStart || 9}
            workingHoursEnd={calendar.workingHoursEnd || 17}
            workingDays={(() => { try { return JSON.parse(calendar.workingDays || '[1,2,3,4,5]') as number[] } catch { return [1, 2, 3, 4, 5] } })()}
            bufferMinutes={calendar.bufferMinutes || 15}
            brandColor={business.brandColor || undefined}
            durationOptions={(() => { try { return JSON.parse(business.durationOptions || '[15,30,45,60]') as number[] } catch { return [15, 30, 45, 60] } })()}
          />
        </div>
      </div>
    </div>
  )
}
