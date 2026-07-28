import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailVerificationCodes } from '@/lib/db/tables'
import { eq, and, gt } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ valid: false, reason: 'Email and code are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const now = new Date()

    const stored = await db
      .select()
      .from(emailVerificationCodes)
      .where(
        and(
          eq(emailVerificationCodes.email, cleanEmail),
          eq(emailVerificationCodes.code, code.toString()),
          eq(emailVerificationCodes.used, false as any),
          gt(emailVerificationCodes.expiresAt, now)
        )
      )
      .limit(1)

    if (!stored.length) {
      return NextResponse.json({ valid: false, reason: 'Invalid or expired verification code' }, { status: 400 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json({ valid: false, reason: 'Verification failed' }, { status: 500 })
  }
}
