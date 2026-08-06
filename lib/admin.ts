import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  user as userTable,
  auditLogs,
  platformSettings,
  featureFlags,
  businessMeta,
  professions,
} from '@/lib/db/tables'

// ---------------------------------------------------------------------------
// JSON helpers (SQLite stores JSON columns as text; Postgres returns objects)
// ---------------------------------------------------------------------------

export function jsn<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'object') return value as T
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

export function str<T>(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value ?? '')
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function fmtNum(n: number | bigint | null | undefined): string {
  if (n == null) return '0'
  return Number(n).toLocaleString('en-US')
}

export function fmtCurrency(
  n: number | bigint | null | undefined,
  currency = 'USD'
): string {
  if (n == null) n = 0
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(n))
  } catch {
    return `$${Number(n).toLocaleString('en-US')}`
  }
}

export function fmtBytes(n: number | bigint | null | undefined): string {
  if (n == null) n = 0
  const bytes = Number(n)
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function fmtDate(d: Date | string | number | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtDateTime(d: Date | string | number | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(d: Date | string | number | null | undefined): string {
  if (!d) return 'never'
  const ms = Date.now() - new Date(d).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase())
}

/**
 * Guard for API route handlers. Returns the admin session or null.
 * Callers should respond 401 when null.
 */
export async function requireAdminApi() {
  return getAdminUser()
}

// ---------------------------------------------------------------------------
// Impersonation tokens (HMAC-signed, time-limited)
// ---------------------------------------------------------------------------

function tokenSecret(): string {
  return process.env.CLIENT_TOKEN_SALT || process.env.BETTER_AUTH_SECRET || 'book-sure-dev'
}

function signToken(payload: string): string {
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url')
}

export async function createImpersonationToken(userId: string, businessId: number) {
  const admin = await getAdminUser()
  if (!admin) return null
  const exp = Date.now() + 1000 * 60 * 60 // 1 hour
  const payload = Buffer.from(
    JSON.stringify({ purpose: 'impersonate', userId, businessId, exp, admin: admin.user.id })
  ).toString('base64url')
  return `${payload}.${signToken(payload)}`
}

export function verifyImpersonationToken(token: string) {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    if (signToken(payload) !== sig) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.purpose !== 'impersonate' || !data.exp || data.exp < Date.now()) return null
    return data as { userId: string; businessId: number; exp: number; admin: string }
  } catch {
    return null
  }
}

/**
 * Returns the authenticated platform admin (session + DB user) or null.
 * Works in both Server Components/Pages and API route handlers.
 */
export async function getAdminUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const currentUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1)
    .then((r) => r[0] || null)

  if (!currentUser || (currentUser.role !== 'admin' && !isAdminEmail(currentUser.email))) {
    return null
  }

  return { session, user: currentUser }
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

export async function audit(
  action: string,
  targetType?: string | null,
  targetId?: string | number | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const admin = await getAdminUser()
    await db.insert(auditLogs).values({
      actorUserId: admin?.user.id ?? null,
      actorEmail: admin?.user.email ?? null,
      action,
      targetType: targetType ?? null,
      targetId: targetId != null ? String(targetId) : null,
      metadata: str(metadata),
      createdAt: new Date(),
    })
  } catch (e) {
    console.error('[audit] failed:', e)
  }
}

// ---------------------------------------------------------------------------
// Platform settings (key/value, JSON values)
// ---------------------------------------------------------------------------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1)
      .then((r) => r[0] || null)
    return row ? jsn<T>(row.value, fallback) : fallback
  } catch {
    return fallback
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const v = str(value)
  await db
    .insert(platformSettings)
    .values({ key, value: v, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: v, updatedAt: new Date() },
    })
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export async function getFlag(key: string): Promise<boolean> {
  try {
    const row = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1)
      .then((r) => r[0] || null)
    return row?.enabled ?? false
  } catch {
    return false
  }
}

export async function seedFlags(
  defaults: { key: string; label: string; description: string; category: string; enabled: boolean }[]
) {
  const existing = await db.select().from(featureFlags)
  const keys = new Set(existing.map((f: any) => f.key))
  for (const d of defaults) {
    if (keys.has(d.key)) continue
    await db.insert(featureFlags).values({
      ...d,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

export async function seedProfessions(
  seeds: { slug: string; name: string; description: string; config: unknown }[]
) {
  const existing = await db.select().from(professions)
  const keys = new Set(existing.map((p: any) => p.slug))
  for (const s of seeds) {
    if (keys.has(s.slug)) continue
    await db.insert(professions).values({
      ...s,
      config: str(s.config),
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

// ---------------------------------------------------------------------------
// Business meta (status / plan / usage), lazily created
// ---------------------------------------------------------------------------

export async function getBusinessMeta(businessId: number) {
  const row = await db
    .select()
    .from(businessMeta)
    .where(eq(businessMeta.businessId, businessId))
    .limit(1)
    .then((r) => r[0] || null)
  if (row) return row
  await db.insert(businessMeta).values({
    businessId,
    status: 'active',
    plan: 'free',
    planStatus: 'active',
    storageBytes: 0,
    aiUsageTokens: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const fresh = await db
    .select()
    .from(businessMeta)
    .where(eq(businessMeta.businessId, businessId))
    .limit(1)
    .then((r) => r[0] || null)
  return fresh
}
