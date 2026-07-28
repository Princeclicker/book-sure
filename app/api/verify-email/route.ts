import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailStatus } from '@/lib/email-verification'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ status: 'invalid', reason: 'Email is required' }, { status: 400 })
    }

    const result = await verifyEmailStatus(email)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ status: 'risky', reason: 'Verification unavailable. You may need to verify with a confirmation code.' }, { status: 200 })
  }
}
