import { redirect } from 'next/navigation'
import { getAdminUser, getSetting } from '@/lib/admin'
import { SETTINGS_SCHEMA } from '@/lib/admin-catalog'
import { PageHeader, Card } from '@/components/admin/page'
import { SettingsForm } from '@/components/admin/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const values: Record<string, unknown> = {}
  for (const group of SETTINGS_SCHEMA) {
    for (const item of group.items) {
      values[item.key] = await getSetting(item.key, item.default)
    }
  }

  return (
    <div>
      <PageHeader title="Platform Settings" description="Global configuration for the whole platform." />

      <div className="mt-6 max-w-4xl">
        <Card title="Settings">
          <div className="p-4">
            <SettingsForm groups={SETTINGS_SCHEMA} values={values} />
          </div>
        </Card>
      </div>
    </div>
  )
}
