import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { appointments, businesses, googleCalendars, businessProfiles, contacts, tasks as tasksTable, opportunities, invoices, contactTimeline, aiInsights } from '@/lib/db/tables'
import { eq, desc, and, gte, lt, sql } from 'drizzle-orm'
import Link from 'next/link'
import { CalendarCheck, Clock, XCircle, CheckCircle, Users, Phone, FileText, ExternalLink, ChevronRight, Zap, DollarSign, TrendingUp, CheckSquare, Sparkles, ArrowRight, Briefcase } from 'lucide-react'
import { getProfessionConfig, getTerminology, type ProfessionId } from '@/lib/profession'
import { generateInsights, getBusinessHealthScore } from '@/lib/ai/rules-engine'
import type { AIInsight } from '@/lib/ai/rules-engine'

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
  const cancelled = allAppointments.filter(a => a.status === 'cancelled').length
  const completed = allAppointments.filter(a => a.eventEnd <= now && a.status !== 'cancelled').length

  const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const outstandingAmount = allInvoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status || '')).reduce((sum, inv) => sum + (inv.total || 0), 0)
  const pipelineValue = openOpps.reduce((sum, opp) => sum + (opp.value || 0), 0)

  const bookingLink = business?.businessSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${business.businessSlug}`
    : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back, {session.user.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your {config.name.toLowerCase()} business today
          </p>
        </div>
        {bookingLink && (
          <Link
            href={`/book/${business!.businessSlug}`}
            target="_blank"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" />
            Share Booking Link
          </Link>
        )}
      </div>

      {/* AI Assistant Widget */}
      {insights.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">AI Business Assistant</h2>
              <p className="text-xs text-muted-foreground">Actionable insights for your business</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.slice(0, 6).map((insight: AIInsight, i: number) => (
              <Link
                key={i}
                href={insight.actionUrl || '#'}
                className={`p-3 rounded-md border transition-colors hover:bg-muted ${
                  insight.priority === 'urgent' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' :
                  insight.priority === 'high' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' :
                  'border-border'
                }`}
              >
                <p className="text-sm font-medium text-foreground line-clamp-1">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<CalendarCheck className="w-4 h-4" />}
          label={`Today's ${terms.appointmentPlural}`}
          value={todayAppts.length}
          color="text-blue-500"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label={`Upcoming ${terms.appointmentPlural}`}
          value={upcoming.length}
          color="text-violet-500"
        />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label={terms.customerPlural}
          value={allContacts.length}
          color="text-emerald-500"
        />
        <StatCard
          icon={<CheckSquare className="w-4 h-4" />}
          label={`Open ${terms.taskPlural}`}
          value={openTasks.length}
          color="text-amber-500"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Pipeline Value"
          value={`$${(pipelineValue / 100).toFixed(0)}`}
          color="text-cyan-500"
        />
        <StatCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Outstanding"
          value={`$${(outstandingAmount / 100).toFixed(0)}`}
          color={outstandingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Appointments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">Today&apos;s {terms.appointmentPlural}</h2>
              <Link href="/appointments" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {todayAppts.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No {terms.appointmentPlural.toLowerCase()} today</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayAppts.slice(0, 5).map(apt => (
                  <div key={apt.id} className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm">{apt.customerName}</p>
                      <p className="text-xs text-muted-foreground">{apt.customerEmail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">
                        {apt.eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{apt.duration}min</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">Upcoming {terms.appointmentPlural}</h2>
                <Link href="/appointments" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {upcoming.slice(0, 5).map(apt => {
                  const isClientAppt = '_businessName' in apt
                  return (
                    <div key={apt.id} className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm flex items-center gap-2">
                          {apt.customerName}
                          {isClientAppt && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-medium">Your booking</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{apt.customerEmail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">
                          {apt.eventStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({apt.duration}min)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pipeline */}
          {openOpps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-foreground">{terms.dealPlural} Pipeline</h2>
                <Link href="/dashboard/opportunities" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {openOpps.slice(0, 5).map(opp => (
                  <div key={opp.id} className="rounded-md border border-border bg-card p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm">{opp.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">Stage: {opp.stage?.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground">${((opp.value || 0) / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{opp.probability || 0}% likely</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Business Health Score */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Business Health</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${healthScore.score}, 100`}
                    className={healthScore.score >= 70 ? 'text-emerald-500' : healthScore.score >= 40 ? 'text-amber-500' : 'text-red-500'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{healthScore.score}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {healthScore.score >= 70 ? 'Healthy' : healthScore.score >= 40 ? 'Needs Attention' : 'At Risk'}
                </p>
                <p className="text-xs text-muted-foreground">Overall score</p>
              </div>
            </div>
            {healthScore.factors.length > 0 && (
              <div className="space-y-1">
                {healthScore.factors.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className={f.impact === 'positive' ? 'text-emerald-600' : f.impact === 'negative' ? 'text-red-600' : 'text-muted-foreground'}>
                      {f.impact === 'positive' ? '+' : ''}{f.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Recent Activity</h3>
            {recentTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentTimeline.slice(0, 5).map(event => (
                  <div key={event.id} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground line-clamp-1">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              <Link href="/dashboard/contacts" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Users className="w-4 h-4" /> Add {terms.customer}
              </Link>
              <Link href="/dashboard/tasks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <CheckSquare className="w-4 h-4" /> Create {terms.task}
              </Link>
              <Link href="/dashboard/opportunities" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <TrendingUp className="w-4 h-4" /> New {terms.deal}
              </Link>
              <Link href="/dashboard/invoices" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <DollarSign className="w-4 h-4" /> Create {terms.invoice}
              </Link>
              <Link href={calendar ? "/settings" : "/connect-calendar"} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <CalendarCheck className="w-4 h-4" /> {calendar ? 'Calendar Settings' : 'Connect Calendar'}
              </Link>
            </div>
          </div>

          {/* Recent Contacts */}
          {allContacts.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Recent {terms.customerPlural}</h3>
                <Link href="/dashboard/contacts" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-1.5">
                {allContacts.slice(0, 5).map(contact => (
                  <Link
                    key={contact.id}
                    href={`/dashboard/contacts/${contact.id}`}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {contact.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.email || contact.phone || 'No contact info'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${color || 'text-muted-foreground'}`}>
        {icon}
        <span className="text-[11px] font-medium truncate">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
