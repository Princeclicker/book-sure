import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { businesses, googleCalendars, businessProfiles } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { SettingsForm } from '@/components/settings-form'
import { BrandingCustomizer } from '@/components/branding-customizer'
import { TimeBlockManager } from '@/components/time-block-manager'
import { ProfessionSettings } from '@/components/profession-settings'
import { ArrowLeft, Calendar, ExternalLink, CheckCircle2, Briefcase } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { DisconnectCalendar } from '@/components/disconnect-calendar'

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id
  const [business, calendar, profile] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1).then(r => r[0] || null),
    db.select().from(googleCalendars).where(eq(googleCalendars.userId, userId)).limit(1).then(r => r[0] || null),
    db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const bookingLink = business?.businessSlug ? `${appUrl}/book/${business.businessSlug}` : null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your business profile and preferences</p>

        <div className="space-y-4">
          {/* Profession / Business Type */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Business Type
            </h2>
            <ProfessionSettings
              initialProfession={profile?.profession || 'freelancer'}
              initialDescription={profile?.businessDescription || ''}
              initialLocation={profile?.location || ''}
              initialTimezone={profile?.timezone || 'UTC'}
              initialCurrency={profile?.currency || 'USD'}
            />
          </div>

          {/* Business Info */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Business Information</h2>
            <SettingsForm
              initialBusiness={
                business || {
                  businessName: '',
                  businessSlug: null,
                  logoUrl: null,
                  brandColor: '#000000',
                }
              }
              initialCalendar={calendar || undefined}
            />
          </div>

          {/* Branding */}
          {business && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">Branding</h2>
              <BrandingCustomizer
                initialBrandColor={business.brandColor || '#3b82f6'}
                initialLogoUrl={business.logoUrl || ''}
              />
            </div>
          )}

          {/* Booking Link */}
          {bookingLink && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-2">Your Booking Link</h2>
              <p className="text-sm text-muted-foreground mb-4">Share this link with customers</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={bookingLink}
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-muted text-foreground text-sm font-mono"
                />
                <CopyButton text={bookingLink} />
              </div>
              <Link
                href={`/book/${business!.businessSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
              >
                <ExternalLink className="w-3 h-3" /> Open booking page
              </Link>
            </div>
          )}

          {/* Calendar */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar Integration
            </h2>
            {calendar ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-foreground">Connected</span>
                    <span className="text-muted-foreground">— working hours: {calendar.workingHoursStart}:00–{calendar.workingHoursEnd}:00</span>
                  </div>
                  <DisconnectCalendar />
                </div>
                <p className="text-xs text-muted-foreground">Timezone: {calendar.timezone || 'UTC'} | Buffer: {calendar.bufferMinutes || 15}min</p>

                {calendar && (
                  <TimeBlockManager calendarId={calendar.id} />
                )}

                <div className="pt-3 border-t border-border">
                  <Link
                    href="/connect-calendar"
                    className="text-sm text-primary hover:underline"
                  >
                    Manage calendar settings
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect Google Calendar to manage your availability and prevent double bookings.
                </p>
                <Link
                  href="/connect-calendar"
                  className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Connect Google Calendar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
