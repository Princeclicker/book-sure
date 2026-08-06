import { NextResponse } from 'next/server'
import { requireAdminApi, audit, getSetting, setSetting } from '@/lib/admin'
import { SETTINGS_SCHEMA } from '@/lib/admin-catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const values: Record<string, unknown> = {}
  for (const group of SETTINGS_SCHEMA) {
    for (const item of group.items) {
      values[item.key] = await getSetting(item.key, item.default)
    }
  }
  return NextResponse.json({ values, schema: SETTINGS_SCHEMA })
}

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const patch = body.values as Record<string, any> | undefined
  if (!patch || typeof patch !== 'object') {
    return NextResponse.json({ error: 'values object required' }, { status: 400 })
  }

  const changed: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    await setSetting(key, value)
    changed.push(key)
  }

  await audit('settings.update', 'settings', null, { keys: changed })
  return NextResponse.json({ ok: true, changed })
}
