import { redirect } from 'next/navigation'
import { desc, eq, like, or, and } from 'drizzle-orm'
import { getAdminUser, fmtDateTime, jsn } from '@/lib/admin'
import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/tables'
import { PageHeader, Card } from '@/components/admin/page'
import { Badge } from '@/components/admin/badge'
import { AuditFilters } from '@/components/admin/audit-filters'

export const dynamic = 'force-dynamic'

const actionFilter = (a: string) => eq(auditLogs.action, a)
const typeFilter = (t: string) => eq(auditLogs.targetType, t)
const qFilter = (q: string) => or(like(auditLogs.actorEmail, `%${q}%`), like(auditLogs.action, `%${q}%`), like(auditLogs.targetId, `%${q}%`))!
const andWhere = (conditions: any[]) => and(...conditions)

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; targetType?: string; q?: string; page?: string }
}) {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const sp = await searchParams
  const action = sp.action ?? ''
  const targetType = sp.targetType ?? ''
  const q = sp.q ?? ''
  const page = Math.max(1, Number(sp.page ?? '1'))
  const pageSize = 30

  const conditions = []
  if (action) conditions.push(actionFilter(action))
  if (targetType) conditions.push(typeFilter(targetType))
  if (q) conditions.push(qFilter(q))

  const where = conditions.length ? andWhere(conditions) : undefined
  const logs = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const totalRows = await db.select().from(auditLogs).where(where)
  const total = totalRows.length
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <PageHeader title="Audit Logs" description="Immutable trail of administrative actions." />

      <div className="mt-4">
        <Card title={`Audit Logs (${total})`}>
          <div className="p-4">
            <AuditFilters />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-3 text-left font-medium text-muted-foreground">Time</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Actor</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Action</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Target</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No audit events found.</td></tr>
                )}
                {logs.map((l) => {
                  const meta = jsn<Record<string, unknown>>(l.metadata, {})
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ''
                  return (
                    <tr key={l.id} className="border-b border-border hover:bg-muted/30 align-top">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(l.createdAt)}</td>
                      <td className="p-3">
                        <div className="text-foreground">{l.actorEmail ?? 'system'}</div>
                        <div className="text-xs text-muted-foreground">{l.actorUserId ?? ''}</div>
                      </td>
                      <td className="p-3"><Badge tone={l.action.startsWith('business') ? 'blue' : l.action.startsWith('user') ? 'purple' : 'gray'}>{l.action}</Badge></td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <div>{l.targetType ?? '—'}</div>
                        <div className="font-mono">{l.targetId ?? ''}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">{metaStr || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between p-4">
              <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a className="h-7 rounded-md border border-border px-3 text-xs flex items-center hover:bg-muted" href={`/admin/audit-logs?page=${page - 1}${action ? `&action=${action}` : ''}${targetType ? `&targetType=${targetType}` : ''}${q ? `&q=${q}` : ''}`}>Prev</a>
                )}
                {page < pages && (
                  <a className="h-7 rounded-md border border-border px-3 text-xs flex items-center hover:bg-muted" href={`/admin/audit-logs?page=${page + 1}${action ? `&action=${action}` : ''}${targetType ? `&targetType=${targetType}` : ''}${q ? `&q=${q}` : ''}`}>Next</a>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
