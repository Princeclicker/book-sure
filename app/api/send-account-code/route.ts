import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { sendAuthVerificationCodeEmail } from '@/lib/email-sender'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const [account] = await db.select({ email: user.email, name: user.name, emailVerified: user.emailVerified }).from(user).where(eq(user.email, email)).limit(1)
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    if (account.emailVerified) return NextResponse.json({ sent: true })

    const sent = await sendAuthVerificationCodeEmail(account.email, account.name)
    if (!sent) return NextResponse.json({ error: 'Email could not be sent' }, { status: 503 })
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('[v0] Account verification code creation failed:', error)
    return NextResponse.json({ error: 'Unable to create verification code' }, { status: 500 })
  }
}
