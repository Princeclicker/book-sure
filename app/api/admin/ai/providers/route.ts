import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdminApi, audit, str } from '@/lib/admin'
import { db } from '@/lib/db'
import { aiProviders, businesses } from '@/lib/db/tables'
import { PROVIDER_TYPES, parseProviderConfig, buildProviderConfig } from '@/lib/ai/admin'

export const dynamic = 'force-dynamic'

function maskKey(key?: string | null): string {
  if (!key) return ''
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
}

export async function GET() {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(aiProviders)
  const providers = rows
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      providerType: p.providerType,
      apiKey: maskKey(p.apiKey),
      hasKey: Boolean(p.apiKey),
      isActive: p.isActive ?? false,
      config: parseProviderConfig(p.config),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

  return NextResponse.json({ providers })
}

export async function POST(req: Request) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, any>
  const providerType = String(body.providerType ?? '').toLowerCase()
  const apiKey = String(body.apiKey ?? '').trim()
  const isActive = Boolean(body.isActive)
  const businessId = Number(body.businessId ?? 0)

  if (!PROVIDER_TYPES.includes(providerType as any)) {
    return NextResponse.json({ error: 'providerType must be one of: openai, anthropic, gemini' }, { status: 400 })
  }
  if (!apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 })

  let userId = admin.user.id
  if (businessId > 0) {
    const biz = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then((r) => r[0] || null)
    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    userId = biz.userId
  }

  const config = str(buildProviderConfig({
    name: String(body.name ?? ''),
    model: String(body.model ?? ''),
    temperature: Number(body.temperature ?? 0.7),
    maxTokens: Number(body.maxTokens ?? 1000),
  }))

  const inserted = await db
    .insert(aiProviders)
    .values({
      userId,
      providerType,
      apiKey,
      isActive,
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: aiProviders.id })
    .then((r) => r[0])

  await audit('ai.provider.create', 'ai_provider', inserted?.id, { providerType, owner: userId })
  return NextResponse.json({ ok: true, id: inserted?.id })
}
