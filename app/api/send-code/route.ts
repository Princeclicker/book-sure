import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailVerificationCodes } from '@/lib/db/tables'
import { eq, and, gt } from 'drizzle-orm'
import { sendVerificationCodeEmail } from '@/lib/email-sender'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    // Invalidate any existing unused codes for this email
    const now = new Date()
    await db.update(emailVerificationCodes)
      .set({ used: true as any })
      .where(
        and(
          eq(emailVerificationCodes.email, cleanEmail),
          eq(emailVerificationCodes.used, false as any),
          gt(emailVerificationCodes.expiresAt, now)
        )
      )

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await db.insert(emailVerificationCodes).values({
      email: cleanEmail,
      code,
      expiresAt,
      used: false as any,
      createdAt: now,
    })

    const sent = await sendVerificationCodeEmail(cleanEmail, code)

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
  }
}
