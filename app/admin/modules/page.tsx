import { redirect } from 'next/navigation'
import { getAdminUser, seedFlags, getFlag } from '@/lib/admin'
import { MODULES, FLAG_DEFAULTS } from '@/lib/admin-catalog'
import { Badge } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { FlagToggle } from '@/components/admin/flag-toggle'
import { Grid3X3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminModulesPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  await seedFlags(FLAG_DEFAULTS)

  const moduleFlags = await Promise.all(
    MODULES.map(async (m) => ({
      ...m,
      enabled: await getFlag(`module-${m.key}`),
    }))
  )

  const enabledCount = moduleFlags.filter((m) => m.enabled).length

  return (
    <div>
      <PageHeader
        title="Module Management"
        description="Enable or disable product modules platform-wide."
        actions={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Grid3X3 className="h-4 w-4" /> {enabledCount}/{moduleFlags.length} enabled
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moduleFlags.map((m) => (
          <Card key={m.key} title={m.label}>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm text-muted-foreground">{m.description}</p>
              <div className="flex items-center justify-between">
                <Badge tone={m.enabled ? 'green' : 'gray'}>{m.enabled ? 'Enabled' : 'Disabled'}</Badge>
                <FlagToggle key={m.key} flagKey={`module-${m.key}`} enabled={m.enabled} label={m.label} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
