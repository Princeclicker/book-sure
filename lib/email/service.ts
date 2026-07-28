import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { emailLog, appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import {
  bookingConfirmedTemplate,
  reminder24hTemplate,
  reminder1hTemplate,
  cancelledTemplate,
  rescheduledTemplate,
  thankYouTemplate,
  feedbackRequestTemplate,
  newBookingNotificationTemplate,
  type EmailTemplateData,
} from './templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export type EmailType =
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'cancelled'
  | 'rescheduled'
  | 'thank_you'
  | 'feedback_request'
  | 'new_booking_notification'

const MAX_RETRIES = 3

// --- Provider detection -------------------------------------------------------
// Production: Resend API (RESEND_API_KEY set)
// Development: Gmail SMTP (SMTP_HOST set)

function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

let _resend: any = null
async function getResend(): Promise<any> {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  const { Resend } = await import('resend')
  _resend = new Resend(key)
  return _resend
}

let _transporter: nodemailer.Transporter | null = null
function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  _transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  })
  return _transporter
}

function getFromAddress(): string {
  if (isResendConfigured()) {
    return process.env.RESEND_FROM_EMAIL || 'notifications@booksure.app'
  }
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@booksure.app'
}

async function getOwnerEmail(userId: string): Promise<string | null> {
  try {
    const { user } = await import('@/lib/db/tables')
    const result = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
    return result.length > 0 ? result[0].email : null
  } catch {
    return null
  }
}

function buildUnsubscribeLink(appointmentId: number, email: string): string {
  const token = Buffer.from(`${appointmentId}:${email}`).toString('base64url')
  return `${APP_URL}/api/unsubscribe?token=${token}`
}

function buildManageLink(manageToken: string | null): string | null {
  return manageToken ? `${APP_URL}/manage/${manageToken}` : null
}

function buildDashboardLink(
  clientToken: string | null,
  businessSlug: string | null,
  isBusinessOwner: boolean
): string | null {
  if (!clientToken || !businessSlug || isBusinessOwner) return null
  return `${APP_URL}/client/dashboard/${businessSlug}/${clientToken}`
}

function buildFeedbackLink(manageToken: string | null): string | null {
  return manageToken ? `${APP_URL}/manage/${manageToken}?feedback=true` : null
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SendEmailParams {
  appointmentId: number
  userId: string
  emailType: EmailType
  recipientEmail: string
  templateData: EmailTemplateData
  replyTo?: string
}

async function logEmailAttempt(
  params: SendEmailParams,
  subject: string,
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(emailLog).values({
      appointmentId: params.appointmentId,
      userId: params.userId,
      emailType: params.emailType,
      recipientEmail: params.recipientEmail,
      subject,
      status,
      errorMessage: errorMessage || null,
      sentAt: status === 'sent' ? new Date() : null,
      createdAt: new Date(),
    })
  } catch (e) {
    console.error('[EmailService] Failed to write email_log:', e)
  }
}

async function updateAppointmentFlag(
  appointmentId: number,
  emailType: EmailType
): Promise<void> {
  const flagMap: Record<EmailType, string> = {
    booking_confirmed: 'emailSent',
    reminder_24h: 'reminder24hEmailSent',
    reminder_1h: 'reminder1hEmailSent',
    cancelled: 'cancelledEmailSent',
    rescheduled: 'rescheduledEmailSent',
    thank_you: 'thankYouEmailSent',
    feedback_request: 'feedbackEmailSent',
    new_booking_notification: 'newBookingNotificationSent',
  }
  const flag = flagMap[emailType]
  if (!flag) return
  try {
    await db
      .update(appointments)
      .set({ [flag]: true, updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))
  } catch (e) {
    console.error(`[EmailService] Failed to update ${flag}:`, e)
  }
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { appointmentId, userId, emailType, recipientEmail, templateData, replyTo } = params

  if (!recipientEmail || !recipientEmail.trim()) {
    console.log(`[EmailService] Skipping ${emailType} — no recipient email for appointment ${appointmentId}`)
    return false
  }

  const resend = await getResend()
  const transporter = getTransporter()

  if (!resend && !transporter) {
    console.log(`[EmailService] No email provider configured. Would send ${emailType} to ${recipientEmail}`)
    await logEmailAttempt(params, '', 'skipped', 'No email provider configured')
    return false
  }

  const templateFn = getTemplateFunction(emailType)
  if (!templateFn) {
    console.error(`[EmailService] Unknown email type: ${emailType}`)
    return false
  }

  const { subject, html, text } = templateFn(templateData)
  const from = getFromAddress()

  try {
    if (resend) {
      // Production: Resend API
      const payload: Record<string, unknown> = {
        from,
        to: [recipientEmail],
        subject,
        html,
        text,
      }
      if (replyTo) {
        payload.reply_to = replyTo
      }
      await resend.emails.send(payload)
    } else {
      // Development: Gmail SMTP via nodemailer
      const mailOptions: Record<string, unknown> = {
        from,
        to: recipientEmail,
        subject,
        html,
        text,
      }
      if (replyTo) {
        mailOptions.replyTo = replyTo
      }
      await transporter!.sendMail(mailOptions)
    }

    const provider = resend ? 'Resend' : 'SMTP'
    console.log(`[EmailService] [${provider}] Sent ${emailType} to ${recipientEmail} for appointment ${appointmentId}`)
    await logEmailAttempt({ ...params, templateData }, subject, 'sent')
    await updateAppointmentFlag(appointmentId, emailType)
    return true
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[EmailService] Failed to send ${emailType} to ${recipientEmail}:`, errMsg)
    await logEmailAttempt({ ...params, templateData }, subject, 'failed', errMsg)
    return false
  }
}

export async function scheduleEmail(params: SendEmailParams): Promise<boolean> {
  return sendEmail(params)
}

export async function sendNewBookingNotificationEmail(appointment: {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  eventStart: Date | string | number
  duration: number
  notes: string | null
  manageToken: string | null
  staffName?: string | null
  serviceName?: string | null
}, business: {
  businessName: string
  businessSlug: string | null
}, ownerEmail: string): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const dashboardLink = appointment.manageToken
    ? `${APP_URL}/manage/${appointment.manageToken}`
    : null

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'new_booking_notification',
    recipientEmail: ownerEmail,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
      notes: appointment.notes,
      customerEmail: appointment.customerEmail,
      bookingReference: appointment.id,
      staffName: appointment.staffName || null,
      serviceName: appointment.serviceName || null,
      dashboardLink,
    },
  })
}

export async function sendBookingConfirmationEmail(appointment: {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  eventStart: Date | string | number
  duration: number
  notes: string | null
  manageToken: string | null
  clientToken: string | null
}, business: {
  businessName: string
  businessSlug: string | null
}, isBusinessOwner: boolean): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const manageLink = buildManageLink(appointment.manageToken)
  const dashboardLink = buildDashboardLink(
    appointment.clientToken,
    business.businessSlug,
    isBusinessOwner
  )
  const unsubscribeLink = buildUnsubscribeLink(appointment.id, appointment.customerEmail)
  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'booking_confirmed',
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
      notes: appointment.notes,
      manageLink,
      dashboardLink,
      unsubscribeLink,
    },
  })
}

export async function sendReminderEmail(
  appointment: {
    id: number
    userId: string
    customerName: string
    customerEmail: string
    eventStart: Date | string | number
    duration: number
    notes: string | null
    manageToken: string | null
    clientToken: string | null
  },
  business: {
    businessName: string
    businessSlug: string | null
  },
  type: 'reminder_24h' | 'reminder_1h'
): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const manageLink = buildManageLink(appointment.manageToken)
  const unsubscribeLink = buildUnsubscribeLink(appointment.id, appointment.customerEmail)
  const dashboardLink = buildDashboardLink(
    appointment.clientToken,
    business.businessSlug,
    false
  )
  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: type,
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
      notes: appointment.notes,
      manageLink,
      dashboardLink,
      unsubscribeLink,
    },
  })
}

export async function sendCancellationEmail(appointment: {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  eventStart: Date | string | number
  duration: number
}, business: {
  businessName: string
}): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'cancelled',
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
    },
  })
}

export async function sendRescheduleEmail(
  appointment: {
    id: number
    userId: string
    customerName: string
    customerEmail: string
    eventStart: Date | string | number
    duration: number
    manageToken: string | null
    clientToken: string | null
    rescheduledFrom: Date | string | number | null
  },
  business: {
    businessName: string
    businessSlug: string | null
  }
): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const manageLink = buildManageLink(appointment.manageToken)
  const unsubscribeLink = buildUnsubscribeLink(appointment.id, appointment.customerEmail)
  const dashboardLink = buildDashboardLink(
    appointment.clientToken,
    business.businessSlug,
    false
  )

  let previousDate: string | undefined
  let previousTime: string | undefined
  if (appointment.rescheduledFrom) {
    const prev = new Date(appointment.rescheduledFrom)
    previousDate = formatDate(prev)
    previousTime = formatTime(prev)
  }

  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'rescheduled',
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
      manageLink,
      dashboardLink,
      unsubscribeLink,
      previousDate,
      previousTime,
    },
  })
}

export async function sendThankYouEmail(appointment: {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  eventStart: Date | string | number
  duration: number
}, business: {
  businessName: string
}): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'thank_you',
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
    },
  })
}

export async function sendFeedbackRequestEmail(appointment: {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  eventStart: Date | string | number
  duration: number
  manageToken: string | null
}, business: {
  businessName: string
}): Promise<boolean> {
  const eventDate = new Date(appointment.eventStart)
  const feedbackLink = buildFeedbackLink(appointment.manageToken)
  const unsubscribeLink = buildUnsubscribeLink(appointment.id, appointment.customerEmail)
  const ownerEmail = await getOwnerEmail(appointment.userId)

  return sendEmail({
    appointmentId: appointment.id,
    userId: appointment.userId,
    emailType: 'feedback_request',
    recipientEmail: appointment.customerEmail,
    replyTo: ownerEmail || undefined,
    templateData: {
      customerName: appointment.customerName,
      businessName: business.businessName,
      date: formatDate(eventDate),
      time: formatTime(eventDate),
      duration: appointment.duration,
      feedbackLink,
      unsubscribeLink,
    },
  })
}

export async function retryFailedEmails(): Promise<{ retried: number; succeeded: number }> {
  const failedLogs = await db
    .select()
    .from(emailLog)
    .where(
      eq(emailLog.status, 'failed')
    )

  let retried = 0
  let succeeded = 0

  for (const log of failedLogs) {
    const retryCount = (log.retryCount ?? 0) + 1
    if (retryCount > MAX_RETRIES) continue

    retried++
    await db
      .update(emailLog)
      .set({ retryCount, status: 'pending' })
      .where(eq(emailLog.id, log.id))
  }

  return { retried, succeeded }
}

function getTemplateFunction(type: EmailType): ((data: EmailTemplateData) => { subject: string; html: string; text: string }) | null {
  switch (type) {
    case 'booking_confirmed': return bookingConfirmedTemplate
    case 'reminder_24h': return reminder24hTemplate
    case 'reminder_1h': return reminder1hTemplate
    case 'cancelled': return cancelledTemplate
    case 'rescheduled': return rescheduledTemplate
    case 'thank_you': return thankYouTemplate
    case 'feedback_request': return feedbackRequestTemplate
    case 'new_booking_notification': return newBookingNotificationTemplate
    default: return null
  }
}
