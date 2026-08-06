import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { requireAdminApi, audit, createImpersonationToken } from '@/lib/admin'
import { db } from '@/lib/db'
import { user, account, businesses } from '@/lib/db/tables'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['user', 'admin']

async function hashPassword(password: string): Promise<string> {
  const mod = await import('@better-auth/utils/password')
  const fn = (mod as any).hashPassword
  if (typeof fn === 'function') return fn(password)
  const { randomBytes, scrypt } = await import('node:crypto')
  const salt = randomBytes(16).toString('hex')
  const key = await new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }, (err, k) =>
      err ? reject(err) : resolve(k as Buffer)
    )
  )
  return `${salt}:${key.toString('hex')}`
}

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  let out = ''
  for (const b of arr) out += chars[b % chars.length]
  return `${out}A1`
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminApi()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: userId } = await params
  const body = (await _req.json().catch(() => ({}))) as Record<string, any>
  const action = String(body.action ?? '')

  const target = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((r) => r[0] || null)

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  switch (action) {
    case 'suspend': {
      if (target.email === admin.user.email) {
        return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 })
      }
      await db.update(user).set({ suspended: true, updatedAt: new Date() }).where(eq(user.id, userId))
      await audit('user.suspend', 'user', userId, { email: target.email })
      return NextResponse.json({ ok: true, suspended: true })
    }

    case 'activate': {
      await db.update(user).set({ suspended: false, updatedAt: new Date() }).where(eq(user.id, userId))
      await audit('user.activate', 'user', userId, { email: target.email })
      return NextResponse.json({ ok: true, suspended: false })
    }

    case 'verify-email': {
      await db.update(user).set({ emailVerified: true, updatedAt: new Date() }).where(eq(user.id, userId))
      await audit('user.verify_email', 'user', userId, { email: target.email })
      return NextResponse.json({ ok: true, emailVerified: true })
    }

    case 'set-role': {
      const role = String(body.role ?? '')
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId))
      await audit('user.set_role', 'user', userId, { email: target.email, role })
      return NextResponse.json({ ok: true, role })
    }

    case 'reset-password': {
      const temp = randomPassword()
      const passwordHash = await hashPassword(temp)
      const accountRows = await db
        .select()
        .from(account)
        .where(eq(account.userId, userId))
        .limit(1)
        .then((r) => r[0] || null)
      if (!accountRows) {
        return NextResponse.json({ error: 'No credential account found for this user' }, { status: 400 })
      }
      await db
        .update(account)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(account.id, accountRows.id))
      await audit('user.reset_password', 'user', userId, { email: target.email })
      return NextResponse.json({ ok: true, tempPassword: temp })
    }

    case 'impersonate': {
      const biz = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.userId, userId))
        .limit(1)
        .then((r: any[]) => r[0] || null)
      const token = await createImpersonationToken(userId, biz?.id ?? 0)
      if (!token) return NextResponse.json({ error: 'Could not issue token' }, { status: 500 })
      await audit('user.impersonate', 'user', userId, { email: target.email })
      return NextResponse.json({ ok: true, url: `/admin/impersonate/${token}` })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
