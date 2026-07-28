import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html><head><title>Unsubscribe</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">
        <h2>Invalid Unsubscribe Link</h2>
        <p>This link is invalid or has expired.</p>
      </body></html>
    `, { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [appointmentIdStr, email] = decoded.split(':')
    const appointmentId = parseInt(appointmentIdStr, 10)

    if (isNaN(appointmentId) || !email) {
      throw new Error('Invalid token format')
    }

    const apt = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1)

    if (!apt.length || apt[0].customerEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      throw new Error('Appointment not found or email mismatch')
    }

    await db
      .update(appointments)
      .set({ unsubscribed: true, updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))

    return new NextResponse(`
      <!DOCTYPE html>
      <html><head><title>Unsubscribed</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">
        <h2>You've been unsubscribed</h2>
        <p>You will no longer receive email notifications for this appointment.</p>
        <p style="color:#999;font-size:13px;margin-top:40px;">If this was a mistake, please contact the business directly.</p>
      </body></html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } })
  } catch {
    return new NextResponse(`
      <!DOCTYPE html>
      <html><head><title>Unsubscribe Error</title></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;">
        <h2>Something went wrong</h2>
        <p>This unsubscribe link is invalid or has expired.</p>
      </body></html>
    `, { status: 400, headers: { 'Content-Type': 'text/html' } })
  }
}
