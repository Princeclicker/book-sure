import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { appointments, businesses, googleCalendars, businessProfiles, contacts, tasks as tasksTable, opportunities, invoices, contactTimeline } from '@/lib/db/tables'
import { eq, desc, and, sql } from 'drizzle-orm'
import { getProfessionConfig, getTerminology, type ProfessionId } from '@/lib/profession'
import { generateInsights, getBusinessHealthScore } from '@/lib/ai/rules-engine'
import DashboardContent from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id
  const userEmail = session.user.email

  const [business, profile, calendar] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1).then(r => r[0] || null),
    db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null),
    db.select().from(googleCalendars).where(eq(googleCalendars.userId, userId)).limit(1).then(r => r[0] || null),
  ])

  const profession = (profile?.profession as ProfessionId) || 'freelancer'
  const terms = getTerminology(profession)
  const config = getProfessionConfig(profession)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [apptsAsProvider, apptsAsClient, allContacts, openTasks, openOpps, allInvoices, recentTimeline, insights, healthScore] = await Promise.all([
    db.select().from(appointments).where(eq(appointments.userId, userId)).orderBy(desc(appointments.eventStart)),
    userEmail
      ? db.select({
          id: appointments.id, userId: appointments.userId, calendarId: appointments.calendarId,
          googleEventId: appointments.googleEventId, customerName: appointments.customerName,
          customerEmail: appointments.customerEmail, customerPhone: appointments.customerPhone,
          eventStart: appointments.eventStart, eventEnd: appointments.eventEnd, duration: appointments.duration,
          status: appointments.status, notes: appointments.notes, manageToken: appointments.manageToken,
          clientToken: appointments.clientToken, notesUpdatedAt: appointments.notesUpdatedAt,
          rescheduledFrom: appointments.rescheduledFrom, createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt, _businessName: businesses.businessName,
        })
        .from(appointments)
        .innerJoin(businesses, eq(businesses.userId, appointments.userId))
        .where(and(eq(appointments.customerEmail, userEmail), sql`${appointments.userId} != ${userId}`))
        .orderBy(desc(appointments.eventStart))
      : [],
    db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.updatedAt)).limit(10),
    db.select().from(tasksTable).where(and(eq(tasksTable.userId, userId), sql`${tasksTable.status} != 'done'`)).orderBy(desc(tasksTable.dueDate)).limit(10),
    db.select().from(opportunities).where(and(eq(opportunities.userId, userId), sql`${opportunities.stage} NOT IN ('won', 'lost')`)).orderBy(desc(opportunities.updatedAt)).limit(10),
    db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt)).limit(10),
    db.select().from(contactTimeline).where(eq(contactTimeline.userId, userId)).orderBy(desc(contactTimeline.createdAt)).limit(10),
    generateInsights(userId, profession),
    getBusinessHealthScore(userId, profession),
  ])

  const allAppointments = [...apptsAsProvider, ...apptsAsClient]
  const upcoming = allAppointments.filter(a => a.eventStart > now && a.status === 'confirmed')
  const todayAppts = allAppointments.filter(a => a.eventStart >= today && a.eventStart < new Date(today.getTime() + 86400000) && a.status === 'confirmed')

  const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const outstandingAmount = allInvoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status || '')).reduce((sum, inv) => sum + (inv.total || 0), 0)
  const pipelineValue = openOpps.reduce((sum, opp) => sum + (opp.value || 0), 0)

  const bookingLink = business?.businessSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${business.businessSlug}`
    : null

  return (
    <DashboardContent
      userName={session.user.name || ''}
      configName={config.name}
      terms={{
        appointmentPlural: terms.appointmentPlural,
        customerPlural: terms.customerPlural,
        taskPlural: terms.taskPlural,
        customer: terms.customer,
        task: terms.task,
        deal: terms.deal,
        dealPlural: terms.dealPlural,
        invoice: terms.invoice,
        appointmentPluralLower: terms.appointmentPlural.toLowerCase(),
      }}
      bookingLink={bookingLink}
      businessSlug={business?.businessSlug || null}
      insights={insights}
      todayAppts={todayAppts}
      upcoming={upcoming}
      allContacts={allContacts}
      openTasks={openTasks}
      pipelineValue={pipelineValue}
      outstandingAmount={outstandingAmount}
      openOpps={openOpps}
      recentTimeline={recentTimeline}
      healthScore={healthScore}
      calendar={!!calendar}
      profession={profession}
    />
  )
}
