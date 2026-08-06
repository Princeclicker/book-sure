import { redirect } from 'next/navigation'
import { getAdminUser, seedFlags } from '@/lib/admin'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/db/tables'
import { FLAG_DEFAULTS } from '@/lib/admin-catalog'
import { Badge } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { FlagToggle } from '@/components/admin/flag-toggle'
import { Flag } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminFeatureFlagsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  await seedFlags(FLAG_DEFAULTS)

  const flags = await db.select().from(featureFlags)
  const byCategory = new Map<string, typeof flags>()
  for (const f of flags) {
    const list = byCategory.get(f.category) ?? []
    list.push(f)
    byCategory.set(f.category, list)
  }

  const enabledCount = flags.filter((f) => f.enabled).length

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        description="Toggle features platform-wide in real time."
        actions={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flag className="h-4 w-4" /> {enabledCount}/{flags.length} enabled
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {[...byCategory.entries()].map(([category, items]) => (
          <Card key={category} title={category}>
            <div className="divide-y divide-border">
              {items.map((f) => (
                <div key={f.key} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{f.label}</p>
                    {f.description && <p className="mt-0.5 text-xs text-muted-foreground">{f.description}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{f.key}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={f.enabled ? 'green' : 'gray'}>{f.enabled ? 'on' : 'off'}</Badge>
                    <FlagToggle flagKey={f.key} label={f.label} enabled={f.enabled} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
