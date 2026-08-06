import { redirect } from 'next/navigation'
import { sql } from 'drizzle-orm'
import { getAdminUser, fmtNum, jsn, seedFlags, seedProfessions } from '@/lib/admin'
import { db } from '@/lib/db'
import { professions, businessProfiles } from '@/lib/db/tables'
import { SEED_PROFESSIONS, FLAG_DEFAULTS } from '@/lib/admin-catalog'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { ProfessionActions } from '@/components/admin/profession-actions'
import { ProfessionCreator } from '@/components/admin/profession-creator'
import { Sparkles, Layers, Hash } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminProfessionsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  await seedFlags(FLAG_DEFAULTS)
  await seedProfessions(SEED_PROFESSIONS)

  const rows = await db.select().from(professions).orderBy(professions.name)

  const usage = await db
    .select({ profession: businessProfiles.profession, count: sql<number>`count(*)` })
    .from(businessProfiles)
    .groupBy(businessProfiles.profession)
  const usageMap = new Map(usage.map((u) => [u.profession, Number(u.count)]))

  const active = rows.filter((r) => !r.isArchived).length
  const custom = rows.filter((r) => r.isCustom).length

  return (
    <div>
      <PageHeader
        title="Profession Studio"
        description="Metadata-driven profession templates — add a new profession with config only, no code."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatValue icon={<Layers className="h-4 w-4" />} label="Total templates" value={fmtNum(rows.length)} />
        <StatValue icon={<Sparkles className="h-4 w-4" />} label="Active" value={fmtNum(active)} />
        <StatValue icon={<Hash className="h-4 w-4" />} label="Custom created" value={fmtNum(custom)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title={`Profession Templates (${rows.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-3 text-left font-medium text-muted-foreground">Profession</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Terminology</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Default modules</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">In use</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No professions yet.</td></tr>
                  )}
                  {rows.map((p) => {
                    const config = jsn<Record<string, any>>(p.config, {})
                    const terms = (config.terminology as any) ?? {}
                    const modules = (config.defaultModules as string[]) ?? []
                    return (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/30 align-top">
                        <td className="p-3">
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">/{p.slug}{p.isCustom && <span className="ml-1 text-primary">custom</span>}</div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <div>client: {terms.clientNoun ?? '—'}</div>
                          <div>booking: {terms.bookingNoun ?? '—'}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {modules.map((m) => (
                              <Badge key={m} tone="blue" className="text-[10px]">{m}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{fmtNum(usageMap.get(p.slug) ?? 0)}</td>
                        <td className="p-3">
                          {p.isArchived ? <Badge tone="red">archived</Badge> : <Badge tone={statusTone('active')}>active</Badge>}
                        </td>
                        <td className="p-3">
                          <ProfessionActions id={p.id} isCustom={p.isCustom} isArchived={p.isArchived} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="New profession template">
            <div className="p-4">
              <ProfessionCreator />
              <p className="mt-4 text-xs text-muted-foreground">
                New professions get a sensible default configuration. Open the config JSON in the
                database (professions.config) to tailor terminology, modules, KPIs and workflows.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
