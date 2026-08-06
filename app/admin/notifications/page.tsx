import { redirect } from 'next/navigation'
import { desc, sql } from 'drizzle-orm'
import { getAdminUser, fmtDateTime } from '@/lib/admin'
import { db } from '@/lib/db'
import { platformNotifications } from '@/lib/db/tables'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { NotificationComposer } from '@/components/admin/notification-composer'
import { NotificationItemActions } from '@/components/admin/notification-item-actions'
import { Bell, BellRing } from 'lucide-react'

export const dynamic = 'force-dynamic'

const severityTone: Record<string, 'green' | 'amber' | 'red' | 'blue'> = {
  info: 'blue',
  success: 'green',
  warning: 'amber',
  danger: 'red',
}

export default async function AdminNotificationsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const notifications = await db
    .select()
    .from(platformNotifications)
    .orderBy(desc(platformNotifications.createdAt))

  const unread = notifications.filter((n) => !n.isRead).length

  return (
    <div>
      <PageHeader
        title="Notifications Center"
        description="Broadcast platform announcements and messages."
        actions={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellRing className="h-4 w-4" /> {unread} unread
          </span>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Notifications (${notifications.length})`}>
            {notifications.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            )}
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${
                      n.severity === 'danger' ? 'text-red-500' : n.severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                        <Badge tone={severityTone[n.severity] ?? 'blue'}>{n.severity}</Badge>
                        <Badge tone="gray">{n.type}</Badge>
                        {!n.isRead && <Badge tone="amber">new</Badge>}
                      </div>
                      {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground/70">{fmtDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                  <NotificationItemActions id={n.id} alreadyRead={n.isRead} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Send a notification">
            <div className="p-4">
              <NotificationComposer />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
