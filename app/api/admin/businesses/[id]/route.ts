import { NextResponse } from 'next/server'
import { eq, inArray } from 'drizzle-orm'
import { requireAdminApi, audit, getBusinessMeta, createImpersonationToken } from '@/lib/admin'
import { db } from '@/lib/db'
import {
  businesses,
  businessMeta,
  googleCalendars,
  appointments,
  manualBlocks,
  businessProfiles,
  contacts,
  contactTimeline,
  tasks,
  opportunities,
  invoices,
  invoiceItems,
  payments,
  teams,
  teamMembers,
  meetingPolls,
  pollVotes,
  workflows,
  workflowActions,
  workflowLogs,
  routingForms,
  formSubmissions,
  aiProviders,
  aiInsights,
} from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

const ALLOWED_PLANS = ['free', 'pro', 'business', 'enterprise']
const ALLOWED_PLAN_STATUS = ['active', 'trialing', 'past_due', 'canceled', 'paused']

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: rawId } = await params
  const businessId = Number(rawId)
  if (!Number.isInteger(businessId) || businessId <= 0) {
    return NextResponse.json({ error: 'Invalid business id' }, { status: 400 })
  }

  const body = (await _req.json().catch(() => ({}))) as Record<string, any>
  const action = String(body.action ?? '')

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then((r) => r[0] || null)

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  switch (action) {
    case 'suspend': {
      await db
        .insert(businessMeta)
        .values({ businessId, status: 'suspended', plan: 'free', planStatus: 'active', storageBytes: 0, aiUsageTokens: 0, createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: businessMeta.businessId, set: { status: 'suspended', updatedAt: new Date() } })
      await audit('business.suspend', 'business', businessId, { business: business.businessName })
      return NextResponse.json({ ok: true, status: 'suspended' })
    }

    case 'activate': {
      await db
        .insert(businessMeta)
        .values({ businessId, status: 'active', plan: 'free', planStatus: 'active', storageBytes: 0, aiUsageTokens: 0, createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: businessMeta.businessId, set: { status: 'active', updatedAt: new Date() } })
      await audit('business.activate', 'business', businessId, { business: business.businessName })
      return NextResponse.json({ ok: true, status: 'active' })
    }

    case 'set-plan': {
      const plan = String(body.plan ?? '')
      if (!ALLOWED_PLANS.includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }
      const planStatus = String(body.planStatus ?? 'active')
      if (!ALLOWED_PLAN_STATUS.includes(planStatus)) {
        return NextResponse.json({ error: 'Invalid plan status' }, { status: 400 })
      }
      await getBusinessMeta(businessId)
      await db
        .update(businessMeta)
        .set({ plan, planStatus, updatedAt: new Date() })
        .where(eq(businessMeta.businessId, businessId))
      await audit('business.set_plan', 'business', businessId, { business: business.businessName, plan, planStatus })
      return NextResponse.json({ ok: true, plan, planStatus })
    }

    case 'impersonate': {
      const token = await createImpersonationToken(business.userId, businessId)
      if (!token) return NextResponse.json({ error: 'Could not issue token' }, { status: 500 })
      await audit('business.impersonate', 'business', businessId, { business: business.businessName })
      return NextResponse.json({ ok: true, url: `/admin/impersonate/${token}` })
    }

    case 'delete': {
      const userId = business.userId

      const workflowIds = db
        .select({ id: workflows.id })
        .from(workflows)
        .where(eq(workflows.userId, userId))
      await db.delete(workflowActions).where(inArray(workflowActions.workflowId, workflowIds))
      await db.delete(workflowLogs).where(eq(workflowLogs.userId, userId))
      await db.delete(workflows).where(eq(workflows.userId, userId))

      const pollIds = db
        .select({ id: meetingPolls.id })
        .from(meetingPolls)
        .where(eq(meetingPolls.userId, userId))
      await db.delete(pollVotes).where(inArray(pollVotes.pollId, pollIds))
      await db.delete(meetingPolls).where(eq(meetingPolls.userId, userId))

      const teamIds = db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.userId, userId))
      await db.delete(teamMembers).where(inArray(teamMembers.teamId, teamIds))
      await db.delete(teams).where(eq(teams.userId, userId))

      const routingFormIds = db
        .select({ id: routingForms.id })
        .from(routingForms)
        .where(eq(routingForms.userId, userId))
      await db.delete(formSubmissions).where(inArray(formSubmissions.formId, routingFormIds))
      await db.delete(routingForms).where(eq(routingForms.userId, userId))

      const invoiceIds = db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.userId, userId))
      await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds))
      await db.delete(invoices).where(eq(invoices.userId, userId))

      await db.delete(aiInsights).where(eq(aiInsights.userId, userId))
      await db.delete(aiProviders).where(eq(aiProviders.userId, userId))
      await db.delete(payments).where(eq(payments.userId, userId))
      await db.delete(opportunities).where(eq(opportunities.userId, userId))
      await db.delete(tasks).where(eq(tasks.userId, userId))
      await db.delete(contactTimeline).where(eq(contactTimeline.userId, userId))
      await db.delete(contacts).where(eq(contacts.userId, userId))
      await db.delete(businessProfiles).where(eq(businessProfiles.userId, userId))
      await db.delete(manualBlocks).where(eq(manualBlocks.userId, userId))
      await db.delete(appointments).where(eq(appointments.userId, userId))
      await db.delete(googleCalendars).where(eq(googleCalendars.userId, userId))
      await db.delete(businessMeta).where(eq(businessMeta.businessId, businessId))
      await db.delete(businesses).where(eq(businesses.id, businessId))
      await audit('business.delete', 'business', businessId, { business: business.businessName })
      return NextResponse.json({ ok: true, deleted: businessId })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
