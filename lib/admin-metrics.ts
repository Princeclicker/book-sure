import { db } from '@/lib/db'
import {
  user,
  session,
  businesses,
  appointments,
  contacts,
  opportunities,
  invoices,
  payments,
  aiInsights,
  emailLog,
  workflowLogs,
  formSubmissions,
  businessMeta,
  platformNotifications,
  auditLogs,
  businessProfiles,
} from '@/lib/db/tables'
import { jsn, timeAgo } from '@/lib/admin'
import { SEED_PROFESSIONS } from '@/lib/admin-catalog'

function toDate(d: unknown): Date | null {
  if (!d) return null
  const t = new Date(d as any)
  return isNaN(t.getTime()) ? null : t
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: monthKey(d),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return out
}

function bucketByMonth(rows: { createdAt: unknown }[], n = 6) {
  const buckets = lastMonths(n).map((m) => ({ label: m.label, value: 0 }))
  const map = new Map(buckets.map((b, i) => [lastMonths(n)[i].key, i]))
  for (const r of rows) {
    const d = toDate(r.createdAt)
    if (!d) continue
    const idx = map.get(monthKey(d))
    if (idx != null) buckets[idx].value++
  }
  return buckets
}

export interface PlatformMetrics {
  totals: {
    businesses: number
    activeBusinesses: number
    users: number
    activeUsersToday: number
    appointments: number
    contacts: number
    opportunities: number
    invoices: number
    paidInvoices: number
    revenue: number
    payments: number
    aiInsights: number
    aiTokens: number
    storageBytes: number
    apiCalls: number
    sessions: number
  }
  charts: {
    businessGrowth: { label: string; value: number }[]
    userGrowth: { label: string; value: number }[]
    appointmentTrends: { label: string; value: number }[]
    revenueTrends: { label: string; value: number }[]
    aiUsage: { label: string; value: number }[]
    storageByBusiness: { label: string; value: number }[]
    appointmentStatus: { label: string; value: number; color: string }[]
  }
  topBusinesses: {
    name: string
    ownerEmail: string
    appointments: number
    status: string
    plan: string
  }[]
  recentActivity: { id: string; type: string; title: string; at: string }[]
  notifications: {
    id: number
    type: string
    severity: string
    title: string
    message: string | null
    isRead: boolean
    createdAt: Date
  }[]
  health: { label: string; ok: boolean; detail: string }[]
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const [users, bizs, appts, contactRows, opps, invs, pays, insights, metaRows, notifications, auditRows, sessions] =
    await Promise.all([
      db.select().from(user),
      db.select().from(businesses),
      db.select().from(appointments),
      db.select().from(contacts),
      db.select().from(opportunities),
      db.select().from(invoices),
      db.select().from(payments),
      db.select().from(aiInsights),
      db.select().from(businessMeta),
      db.select().from(platformNotifications),
      db.select().from(auditLogs),
      db.select().from(session),
    ])

  const [emailLogs, wfLogs, submissions, profiles] = await Promise.all([
    db.select().from(emailLog),
    db.select().from(workflowLogs),
    db.select().from(formSubmissions),
    db.select().from(businessProfiles),
  ])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysAgo = (days: number) => now.getTime() - days * 86_400_000

  const metaByBiz = new Map<number, any>()
  for (const m of metaRows) metaByBiz.set(m.businessId, m)

  const appointmentsByUser = new Map<string, number>()
  for (const a of appts) {
    appointmentsByUser.set(a.userId, (appointmentsByUser.get(a.userId) ?? 0) + 1)
  }

  const usersByEmail = new Map<string, any>()
  for (const u of users) usersByEmail.set(u.email.toLowerCase(), u)

  const activeBusinessIds = new Set(
    appts.filter((a) => new Date(a.createdAt as any).getTime() >= daysAgo(30)).map((a) => a.userId)
  )

  let activeBusinesses = 0
  for (const b of bizs) {
    const meta = metaByBiz.get(b.id)
    if (meta?.status === 'active' || activeBusinessIds.has(b.userId)) activeBusinesses++
  }

  let activeUsersToday = 0
  const seenToday = new Set<string>()
  for (const s of sessions) {
    const d = new Date(s.createdAt as any).getTime()
    if (d >= today && !seenToday.has(s.userId)) {
      seenToday.add(s.userId)
      activeUsersToday++
    }
  }
  for (const a of appts) {
    const d = new Date(a.createdAt as any).getTime()
    if (d >= today && !seenToday.has(a.userId)) {
      seenToday.add(a.userId)
      activeUsersToday++
    }
  }

  const revenue = pays.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const paidInvoices = invs.filter((i) => i.status === 'paid')
  const revenueFromInvoices = paidInvoices.reduce((s, i) => s + Number(i.total ?? 0), 0)

  let storageBytes = 0
  let aiTokens = 0
  for (const m of metaRows) {
    storageBytes += Number(m.storageBytes ?? 0)
    aiTokens += Number(m.aiUsageTokens ?? 0)
  }

  const apiCalls =
    emailLogs.length + wfLogs.length + submissions.length + insights.length + appts.length

  const statusCounts = new Map<string, number>()
  for (const a of appts) statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1)
  const statusColors: Record<string, string> = {
    confirmed: '#10b981',
    completed: '#3b82f6',
    cancelled: '#ef4444',
    pending: '#f59e0b',
    'no-show': '#8b5cf6',
  }

  const topByUser = [...appointmentsByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topBusinesses = topByUser
    .map(([uid, count]) => {
      const b = bizs.find((x) => x.userId === uid)
      const meta = b ? metaByBiz.get(b.id) : null
      return {
        name: b?.businessName ?? 'Unknown business',
        ownerEmail: usersByEmail.get((users.find((u) => u.id === uid)?.email ?? '').toLowerCase())?.email ?? '—',
        appointments: count,
        status: meta?.status ?? 'active',
        plan: meta?.plan ?? 'free',
      }
    })
    .filter((t) => t.name !== 'Unknown business')

  const activity: PlatformMetrics['recentActivity'] = []
  for (const r of auditRows.slice(0, 15)) {
    activity.push({
      id: `audit-${r.id}`,
      type: 'audit',
      title: `${r.action}${r.targetType ? ` · ${r.targetType}` : ''}${r.targetId ? ` #${r.targetId}` : ''}`,
      at: timeAgo(r.createdAt),
    })
  }
  for (const b of bizs.slice(0, 8)) {
    activity.push({ id: `biz-${b.id}`, type: 'business', title: `Business created · ${b.businessName}`, at: timeAgo(b.createdAt) })
  }
  for (const u of users.slice(0, 8)) {
    activity.push({ id: `user-${u.id}`, type: 'user', title: `New user · ${u.email}`, at: timeAgo(u.createdAt) })
  }
  for (const a of [...appts].sort((x, y) => new Date(y.createdAt as any).getTime() - new Date(x.createdAt as any).getTime()).slice(0, 8)) {
    activity.push({ id: `appt-${a.id}`, type: 'appointment', title: `Appointment · ${a.customerName} (${a.status})`, at: timeAgo(a.createdAt) })
  }
  activity.sort((a, b) => a.at.localeCompare(b.at)).reverse()

  const storageByBusiness = [...metaByBiz.entries()]
    .map(([id, m]) => {
      const b = bizs.find((x) => x.id === id)
      return { label: b?.businessName ?? `Business #${id}`, value: Number(m.storageBytes ?? 0) }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const profileMap = new Map<string, string>()
  for (const p of profiles) profileMap.set(p.userId, p.profession)

  const health: PlatformMetrics['health'] = [
    {
      label: 'Database',
      ok: true,
      detail: users.length >= 0 ? 'Connected' : 'Unknown',
    },
    {
      label: 'Email (SMTP)',
      ok: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      detail: process.env.SMTP_HOST ? 'Configured' : 'Not configured',
    },
    {
      label: 'SMS',
      ok: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid_here'),
      detail: 'Twilio',
    },
    {
      label: 'AI Engine',
      ok: insights.length > 0,
      detail: insights.length > 0 ? `${insights.length} insights generated` : 'Local rules engine active',
    },
    {
      label: 'Google OAuth',
      ok: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      detail: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
    },
  ]

  return {
    totals: {
      businesses: bizs.length,
      activeBusinesses,
      users: users.length,
      activeUsersToday,
      appointments: appts.length,
      contacts: contactRows.length,
      opportunities: opps.length,
      invoices: invs.length,
      paidInvoices: paidInvoices.length,
      revenue: revenue || revenueFromInvoices,
      payments: pays.length,
      aiInsights: insights.length,
      aiTokens,
      storageBytes,
      apiCalls,
      sessions: sessions.length,
    },
    charts: {
      businessGrowth: bucketByMonth(bizs),
      userGrowth: bucketByMonth(users),
      appointmentTrends: bucketByMonth(appts),
      revenueTrends: bucketByMonth(pays as any),
      aiUsage: bucketByMonth(insights),
      storageByBusiness,
      appointmentStatus: [...statusCounts.entries()].map(([label, value]) => ({
        label,
        value,
        color: statusColors[label] ?? '#6b7280',
      })),
    },
    topBusinesses,
    recentActivity: activity.slice(0, 12),
    notifications: [...notifications].sort(
      (a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()
    ),
    health,
  }
}

export { jsn, SEED_PROFESSIONS }
