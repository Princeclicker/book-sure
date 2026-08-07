import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit, str } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiProviders } from '@/lib/db/tables'
import { PROVIDER_TYPES, parseProviderConfig, buildProviderConfig } from '@/lib/ai/admin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const providerId = Number(id)
  if (!Number.isInteger(providerId) || providerId <= 0) {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, providerId))
    .limit(1)
    .then((r) => r[0] || null)
  if (!existing) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>

  const patch: Record<string, unknown> = { updatedAt: new Date() }

  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive

  if (typeof body.providerType === 'string') {
    const providerType = body.providerType.toLowerCase()
    if (!PROVIDER_TYPES.includes(providerType as any)) {
      return NextResponse.json({ error: 'providerType must be one of: openai, anthropic, gemini' }, { status: 400 })
    }
    patch.providerType = providerType
  }

  if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    patch.apiKey = body.apiKey.trim()
  }

  if (body.config && typeof body.config === 'object') {
    const prev = parseProviderConfig(existing.config)
    patch.config = str(buildProviderConfig({
      name: body.config.name ?? prev.name,
      model: body.config.model ?? prev.model,
      temperature: body.config.temperature ?? prev.temperature,
      maxTokens: body.config.maxTokens ?? prev.maxTokens,
    }))
  }

  await db.update(aiProviders).set(patch).where(eq(aiProviders.id, providerId))
  await audit('ai.provider.update', 'ai_provider', providerId, {
    providerType: patch.providerType ?? existing.providerType,
  })
  return NextResponse.json({ ok: true, id: providerId })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const providerId = Number(id)
  if (!Number.isInteger(providerId) || providerId <= 0) {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 })
  }

  const existing = await db
    .select({ id: aiProviders.id, providerType: aiProviders.providerType })
    .from(aiProviders)
    .where(eq(aiProviders.id, providerId))
    .limit(1)
    .then((r) => r[0] || null)
  if (!existing) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  await db.delete(aiProviders).where(eq(aiProviders.id, providerId))
  await audit('ai.provider.delete', 'ai_provider', providerId, {
    providerType: existing.providerType,
  })
  return NextResponse.json({ ok: true })
}
