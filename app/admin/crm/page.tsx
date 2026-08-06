import { redirect } from 'next/navigation'
import { sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, fmtDateTime } from '@/lib/admin'
import { db } from '@/lib/db'
import { contacts, opportunities, tasks, contactTimeline } from '@/lib/db/tables'
import { StatCard } from '@/components/admin/stat-card'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { Contact, Target, CheckSquare, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCrmPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const [contactRows, oppRows, taskRows, timeline] = await Promise.all([
    db.select().from(contacts),
    db.select().from(opportunities),
    db.select().from(tasks),
    db.select().from(contactTimeline).orderBy(sql`${contactTimeline.createdAt} desc`).limit(20),
  ])

  const stageCount = new Map<string, number>()
  for (const o of oppRows) stageCount.set(o.stage ?? 'unknown', (stageCount.get(o.stage ?? 'unknown') ?? 0) + 1)

  const taskStatus = new Map<string, number>()
  for (const t of taskRows) taskStatus.set(t.status ?? 'pending', (taskStatus.get(t.status ?? 'pending') ?? 0) + 1)

  const totalValue = oppRows.reduce((sum, o) => sum + Number(o.value ?? 0), 0)

  return (
    <div>
      <PageHeader title="CRM Analytics" description="Contacts, pipeline and tasks across all businesses." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Contacts" value={fmtNum(contactRows.length)} icon={<Contact className="h-4 w-4" />} />
        <StatCard label="Opportunities" value={fmtNum(oppRows.length)} icon={<Target className="h-4 w-4" />} />
        <StatCard label="Pipeline Value" value={`$${fmtNum(totalValue)}`} tone="positive" icon={<Target className="h-4 w-4" />} />
        <StatCard label="Tasks" value={fmtNum(taskRows.length)} icon={<CheckSquare className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Pipeline by Stage">
          <div className="divide-y divide-border">
            {stageCount.size === 0 && <p className="p-4 text-sm text-muted-foreground">No opportunities yet.</p>}
            {[...stageCount.entries()].map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{stage}</span>
                <Badge tone={statusTone(stage)}>{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Tasks by Status">
          <div className="divide-y divide-border">
            {taskStatus.size === 0 && <p className="p-4 text-sm text-muted-foreground">No tasks yet.</p>}
            {[...taskStatus.entries()].map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{status}</span>
                <Badge tone={statusTone(status)}>{fmtNum(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Recent Contact Timeline Activity">
          <div className="divide-y divide-border">
            {timeline.length === 0 && <p className="p-4 text-sm text-muted-foreground">No contact activity yet.</p>}
            {timeline.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="truncate text-sm text-foreground">{t.title || t.eventType || '—'}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(t.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
