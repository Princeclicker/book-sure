'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function AuditFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function apply(formData: FormData) {
    const q = new URLSearchParams()
    const action = String(formData.get('action') ?? '').trim()
    const targetType = String(formData.get('targetType') ?? '').trim()
    const email = String(formData.get('q') ?? '').trim()
    if (action) q.set('action', action)
    if (targetType) q.set('targetType', targetType)
    if (email) q.set('q', email)
    router.push(`/admin/audit-logs${q.toString() ? `?${q.toString()}` : ''}`)
  }

  return (
    <form action={apply} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Action</label>
        <input
          name="action"
          className="mt-1 h-8 w-44 rounded-md border border-border bg-background px-2 text-sm"
          defaultValue={params.get('action') ?? ''}
          placeholder="e.g. business.suspend"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Target type</label>
        <select
          name="targetType"
          className="mt-1 h-8 rounded-md border border-border bg-background px-2 text-sm"
          defaultValue={params.get('targetType') ?? ''}
        >
          <option value="">All</option>
          <option value="business">business</option>
          <option value="user">user</option>
          <option value="feature_flag">feature_flag</option>
          <option value="profession">profession</option>
          <option value="notification">notification</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Email / id</label>
        <input
          name="q"
          className="mt-1 h-8 w-44 rounded-md border border-border bg-background px-2 text-sm"
          defaultValue={params.get('q') ?? ''}
        />
      </div>
      <Button size="sm" type="submit">Filter</Button>
      {params.size > 0 && (
        <Button size="sm" variant="ghost" onClick={() => router.push('/admin/audit-logs')}>Clear</Button>
      )}
    </form>
  )
}
