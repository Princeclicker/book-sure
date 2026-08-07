import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin'
import { PROVIDER_TYPES, testProviderConnection } from '@/lib/ai/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const providerType = String(body.providerType ?? '').toLowerCase()
  const apiKey = String(body.apiKey ?? '').trim()
  const model = String(body.model ?? '').trim() || undefined

  if (!PROVIDER_TYPES.includes(providerType as any)) {
    return NextResponse.json({ error: 'providerType must be one of: openai, anthropic, gemini' }, { status: 400 })
  }
  if (!apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 })

  const result = await testProviderConnection(providerType, apiKey, model)
  return NextResponse.json(result)
}
