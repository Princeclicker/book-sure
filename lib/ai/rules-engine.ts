import { db } from '@/lib/db'
import { contacts, appointments, tasks, opportunities, invoices, payments, contactTimeline } from '@/lib/db/tables'
import { eq, and, desc, sql, lt, gte } from 'drizzle-orm'
import type { ProfessionId } from '@/lib/profession'
import { getTerminology } from '@/lib/profession'

export interface AIInsight {
  type: 'follow_up' | 'overdue_invoice' | 'inactive_contact' | 'appointment_prep' | 'pipeline_health' | 'revenue_alert' | 'task_reminder' | 'at_risk' | 'opportunity' | 'daily_summary'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  actionType?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}

export async function generateInsights(userId: string, profession: ProfessionId): Promise<AIInsight[]> {
  const terms = getTerminology(profession)
  const insights: AIInsight[] = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 1. Contacts needing follow-up (no contact in 7+ days)
  const staleContacts = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        eq(contacts.status, 'active'),
        lt(contacts.lastContactAt, thirtyDaysAgo)
      )
    )
    .limit(5)

  for (const contact of staleContacts) {
    const daysSince = Math.floor((now.getTime() - (contact.lastContactAt?.getTime() || contact.updatedAt.getTime())) / (1000 * 60 * 60 * 24))
    insights.push({
      type: 'follow_up',
      title: `${terms.followUp} needed: ${contact.name}`,
      description: `No contact with ${contact.name} for ${daysSince} days. Consider reaching out.`,
      priority: daysSince > 30 ? 'high' : 'medium',
      actionType: 'contact',
      actionUrl: `/dashboard/contacts/${contact.id}`,
      actionLabel: `View ${terms.customer}`,
    })
  }

  // 2. Overdue invoices
  const overdueInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'sent'),
        lt(invoices.dueDate, now)
      )
    )
    .limit(5)

  for (const invoice of overdueInvoices) {
    const daysOverdue = Math.floor((now.getTime() - (invoice.dueDate?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24))
    insights.push({
      type: 'overdue_invoice',
      title: `${terms.invoice} overdue: ${invoice.invoiceNumber}`,
      description: `${terms.invoice} ${invoice.invoiceNumber} is ${daysOverdue} days overdue ($${(invoice.total / 100).toFixed(2)}).`,
      priority: daysOverdue > 30 ? 'urgent' : 'high',
      actionType: 'invoice',
      actionUrl: `/dashboard/invoices/${invoice.id}`,
      actionLabel: `View ${terms.invoice}`,
    })
  }

  // 3. Upcoming appointments today
  const todayStart = new Date(today)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const todayAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.userId, userId),
        gte(appointments.eventStart, todayStart),
        lt(appointments.eventStart, todayEnd),
        eq(appointments.status, 'confirmed')
      )
    )

  if (todayAppointments.length > 0) {
    insights.push({
      type: 'appointment_prep',
      title: `${todayAppointments.length} ${terms.appointmentPlural.toLowerCase()} today`,
      description: `You have ${todayAppointments.length} ${terms.appointmentPlural.toLowerCase()} scheduled today. Prepare for your upcoming meetings.`,
      priority: 'high',
      actionType: 'appointments',
      actionUrl: '/appointments',
      actionLabel: `View ${terms.appointmentPlural}`,
    })
  }

  // 4. Overdue tasks
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        lt(tasks.dueDate, now),
        sql`${tasks.status} != 'done'`
      )
    )
    .limit(5)

  for (const task of overdueTasks) {
    insights.push({
      type: 'task_reminder',
      title: `Overdue: ${task.title}`,
      description: `This ${terms.task.toLowerCase()} was due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'previously'}.`,
      priority: task.priority === 'urgent' ? 'urgent' : 'high',
      actionType: 'task',
      actionUrl: '/dashboard/tasks',
      actionLabel: `View ${terms.taskPlural}`,
    })
  }

  // 5. Pipeline health (opportunities stuck in same stage)
  const staleOpportunities = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.userId, userId),
        sql`${opportunities.stage} NOT IN ('won', 'lost')`,
        lt(opportunities.updatedAt, thirtyDaysAgo)
      )
    )
    .limit(3)

  if (staleOpportunities.length > 0) {
    const totalStaleValue = staleOpportunities.reduce((sum, o) => sum + (o.value || 0), 0)
    insights.push({
      type: 'pipeline_health',
      title: `${staleOpportunities.length} stale ${terms.dealPlural.toLowerCase()}`,
      description: `${staleOpportunities.length} ${terms.dealPlural.toLowerCase()} haven't been updated in 30+ days. Total value: $${(totalStaleValue / 100).toFixed(2)}.`,
      priority: 'medium',
      actionType: 'opportunities',
      actionUrl: '/dashboard/opportunities',
      actionLabel: `View Pipeline`,
    })
  }

  // 6. Inactive contacts (no activity in 60+ days)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const inactiveContacts = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        eq(contacts.status, 'active'),
        lt(contacts.lastContactAt, sixtyDaysAgo)
      )
    )
    .limit(3)

  if (inactiveContacts.length > 0) {
    insights.push({
      type: 'at_risk',
      title: `${inactiveContacts.length} inactive ${terms.customerPlural.toLowerCase()}`,
      description: `${inactiveContacts.length} ${terms.customerPlural.toLowerCase()} haven't had any activity in 60+ days. They may be at risk of leaving.`,
      priority: 'medium',
      actionType: 'contacts',
      actionUrl: '/dashboard/contacts',
      actionLabel: `View ${terms.customerPlural}`,
    })
  }

  // 7. Open opportunities summary
  const openOpps = await db
    .select({ count: sql<number>`count(*)`, totalValue: sql<number>`coalesce(sum(${opportunities.value}), 0)` })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.userId, userId),
        sql`${opportunities.stage} NOT IN ('won', 'lost')`
      )
    )

  if (openOpps[0].count > 0) {
    insights.push({
      type: 'opportunity',
      title: `${openOpps[0].count} open ${terms.dealPlural.toLowerCase()}`,
      description: `You have ${openOpps[0].count} open ${terms.dealPlural.toLowerCase()} worth $${(openOpps[0].totalValue / 100).toFixed(2)} in total.`,
      priority: 'low',
      actionType: 'opportunities',
      actionUrl: '/dashboard/opportunities',
      actionLabel: 'View Pipeline',
    })
  }

  // 8. Outstanding invoices total
  const outstandingInvoices = await db
    .select({ count: sql<number>`count(*)`, totalValue: sql<number>`coalesce(sum(${invoices.total}), 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        sql`${invoices.status} IN ('sent', 'partial', 'overdue')`
      )
    )

  if (outstandingInvoices[0].count > 0) {
    insights.push({
      type: 'revenue_alert',
      title: `$${(outstandingInvoices[0].totalValue / 100).toFixed(2)} in outstanding ${terms.invoicePlural.toLowerCase()}`,
      description: `${outstandingInvoices[0].count} ${terms.invoicePlural.toLowerCase()} are awaiting payment.`,
      priority: outstandingInvoices[0].totalValue > 100000 ? 'high' : 'medium',
      actionType: 'invoices',
      actionUrl: '/dashboard/invoices',
      actionLabel: `View ${terms.invoicePlural}`,
    })
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return insights.slice(0, 10)
}

export async function getBusinessHealthScore(userId: string, profession: ProfessionId): Promise<{
  score: number
  factors: Array<{ label: string; score: number; impact: string }>
}> {
  let score = 50
  const factors: Array<{ label: string; score: number; impact: string }> = []

  // Factor: Active contacts
  const [{ count: contactCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(eq(contacts.userId, userId))

  if (contactCount > 10) { score += 10; factors.push({ label: 'Contact Base', score: 10, impact: 'positive' }) }
  else if (contactCount > 0) { score += 5; factors.push({ label: 'Contact Base', score: 5, impact: 'neutral' }) }
  else { score -= 10; factors.push({ label: 'Contact Base', score: -10, impact: 'negative' }) }

  // Factor: Open opportunities
  const [{ count: oppCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(opportunities)
    .where(and(eq(opportunities.userId, userId), sql`${opportunities.stage} NOT IN ('won', 'lost')`))

  if (oppCount > 5) { score += 10; factors.push({ label: 'Pipeline Activity', score: 10, impact: 'positive' }) }
  else if (oppCount > 0) { score += 5; factors.push({ label: 'Pipeline Activity', score: 5, impact: 'neutral' }) }

  // Factor: Overdue invoices
  const [{ count: overdueCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), sql`${invoices.status} IN ('sent', 'partial')`, lt(invoices.dueDate, new Date())))

  if (overdueCount > 0) { score -= overdueCount * 5; factors.push({ label: 'Overdue Invoices', score: -overdueCount * 5, impact: 'negative' }) }

  // Factor: Completed tasks
  const [{ count: completedTasks }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, 'done')))

  const [{ count: totalTasks }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.userId, userId))

  const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0
  if (taskCompletionRate > 0.8) { score += 10; factors.push({ label: 'Task Completion', score: 10, impact: 'positive' }) }
  else if (taskCompletionRate > 0.5) { score += 5; factors.push({ label: 'Task Completion', score: 5, impact: 'neutral' }) }

  score = Math.max(0, Math.min(100, score))

  return { score, factors }
}
