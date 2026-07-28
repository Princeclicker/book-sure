import { db } from '@/lib/db'
import { workflows, workflowActions, workflowLogs, businesses, teamMembers } from '@/lib/db/tables'
import { eq, and } from 'drizzle-orm'
import nodemailer from 'nodemailer'

const TRIGGER_MAP: Record<string, string> = {
  booking_confirmed: 'booking_confirmed',
  appointment_booked: 'booking_confirmed',
  appointment_confirmed: 'booking_confirmed',
  appointment_cancelled: 'appointment_cancelled',
  appointment_rescheduled: 'appointment_rescheduled',
  appointment_completed: 'appointment_completed',
  appointment_no_show: 'appointment_no_show',
  before_appointment: 'before_appointment',
  after_appointment: 'after_appointment',
}

const REVERSE_TRIGGER_MAP: Record<string, string> = {
  booking_confirmed: 'Appointment Booked',
  appointment_cancelled: 'Appointment Cancelled',
  appointment_rescheduled: 'Appointment Rescheduled',
  appointment_completed: 'Appointment Completed',
  appointment_no_show: 'Appointment No-Show',
  before_appointment: 'Before Appointment',
  after_appointment: 'After Appointment',
}

export interface WorkflowAppointmentData {
  id: number
  userId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventStart: Date | string | number
  eventEnd: Date | string | number
  duration: number
  status: string
  notes?: string | null
  manageToken?: string | null
  clientToken?: string | null
  calendarId?: number
}

export type WorkflowTrigger =
  | 'booking_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'appointment_completed'
  | 'appointment_no_show'

function replaceVariables(template: string, data: WorkflowAppointmentData, businessName: string): string {
  const eventDate = new Date(data.eventStart)
  const dateStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const timeStr = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const bookingRef = data.manageToken
    ? data.manageToken.substring(0, 8).toUpperCase()
    : `APT-${data.id}`

  const variables: Record<string, string> = {
    'customer_name': data.customerName || '',
    'customerName': data.customerName || '',
    'customer_email': data.customerEmail || '',
    'customerEmail': data.customerEmail || '',
    'customer_phone': data.customerPhone || '',
    'customerPhone': data.customerPhone || '',
    'service_name': businessName || '',
    'serviceName': businessName || '',
    'appointment_date': dateStr,
    'appointmentDate': dateStr,
    'date': dateStr,
    'appointment_time': timeStr,
    'appointmentTime': timeStr,
    'time': timeStr,
    'business_name': businessName || '',
    'businessName': businessName || '',
    'staff_name': businessName || '',
    'staffName': businessName || '',
    'booking_reference': bookingRef,
    'bookingReference': bookingRef,
    'duration': String(data.duration || ''),
    'notes': data.notes || '',
  }

  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
  }
  return result
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
    socketTimeout: 15000,
  })
  return _transporter
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@booksure.app'
}

async function executeEmailAction(
  action: { subject: string | null; message: string },
  appointment: WorkflowAppointmentData,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[Workflow] SMTP not configured. Would send email to:', appointment.customerEmail)
    return { success: true }
  }

  const subject = replaceVariables(action.subject || 'Notification from ' + businessName, appointment, businessName)
  const body = replaceVariables(action.message, appointment, businessName)

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: appointment.customerEmail,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">${body.replace(/\n/g, '<br>')}</div>`,
      text: body,
    })
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Workflow] Email send failed:', msg)
    return { success: false, error: msg }
  }
}

async function executeSmsAction(
  action: { message: string },
  appointment: WorkflowAppointmentData,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[Workflow] Twilio not configured. Would send SMS to:', appointment.customerPhone)
    return { success: true }
  }

  const message = replaceVariables(action.message, appointment, businessName)

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          To: appointment.customerPhone,
          From: fromNumber,
          Body: message,
        }).toString(),
      }
    )
    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: errText }
    }
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  }
}

async function executeUpdateStatusAction(
  config: Record<string, unknown>,
  appointmentId: number
): Promise<{ success: boolean; error?: string }> {
  const newStatus = config.status as string
  if (!newStatus) return { success: false, error: 'No status specified in config' }
  try {
    const { appointments: aptTable } = await import('@/lib/db/tables')
    await db.update(aptTable).set({ status: newStatus, updatedAt: new Date() }).where(eq(aptTable.id, appointmentId))
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function executeAssignTeamAction(
  config: Record<string, unknown>,
  appointmentId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const memberName = config.memberName as string
  if (!memberName) return { success: false, error: 'No team member specified' }
  try {
    const member = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.memberName, memberName))
      .limit(1)
    if (member.length === 0) return { success: false, error: `Team member "${memberName}" not found` }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function executeAddNoteAction(
  config: Record<string, unknown>,
  appointmentId: number
): Promise<{ success: boolean; error?: string }> {
  const note = config.note as string
  if (!note) return { success: false, error: 'No note specified' }
  try {
    const { appointments: aptTable } = await import('@/lib/db/tables')
    await db.update(aptTable).set({ notes: note, updatedAt: new Date() }).where(eq(aptTable.id, appointmentId))
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function executeInternalNotificationAction(
  action: { message: string; subject?: string | null },
  appointment: WorkflowAppointmentData,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const body = replaceVariables(action.message, appointment, businessName)
  console.log(`[Workflow:InternalNotification] To: ${appointment.customerEmail} | Subject: ${action.subject || 'Notification'} | Body: ${body}`)
  return { success: true }
}

export async function triggerWorkflows(
  trigger: WorkflowTrigger,
  appointment: WorkflowAppointmentData
): Promise<void> {
  const normalizedTrigger = TRIGGER_MAP[trigger] || trigger

  const matchingWorkflows = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.userId, appointment.userId),
        eq(workflows.isActive, true)
      )
    )

  const triggered = matchingWorkflows.filter((w: typeof matchingWorkflows[number]) => {
    const wfTrigger = TRIGGER_MAP[w.trigger] || w.trigger
    return wfTrigger === normalizedTrigger
  })

  if (triggered.length === 0) return

  const biz = await db
    .select()
    .from(businesses)
    .where(eq(businesses.userId, appointment.userId))
    .limit(1)
  const businessName = biz.length > 0 ? biz[0].businessName : 'Business'

  for (const wf of triggered) {
    const actions = await db
      .select()
      .from(workflowActions)
      .where(eq(workflowActions.workflowId, wf.id))
      .orderBy(workflowActions.sortOrder)

    if (actions.length === 0) {
      // Backward compatibility: use workflow's own actionType/message
      if (wf.message) {
        await executeSingleAction(
          wf.id, wf.actionType, wf.subject, wf.message, null,
          appointment, businessName, normalizedTrigger
        )
      }
      continue
    }

    for (const action of actions) {
      await executeSingleAction(
        wf.id, action.actionType, action.subject, action.message,
        action.config ? (typeof action.config === 'string' ? JSON.parse(action.config) : action.config) as Record<string, unknown> : {},
        appointment, businessName, normalizedTrigger
      )
    }
  }
}

async function executeSingleAction(
  workflowId: number,
  actionType: string,
  subject: string | null,
  message: string,
  config: Record<string, unknown> | null,
  appointment: WorkflowAppointmentData,
  businessName: string,
  trigger: string
): Promise<void> {
  let result: { success: boolean; error?: string }

  switch (actionType) {
    case 'email':
      result = await executeEmailAction({ subject, message }, appointment, businessName)
      break
    case 'sms':
      result = await executeSmsAction({ message }, appointment, businessName)
      break
    case 'internal_notification':
      result = await executeInternalNotificationAction({ subject, message }, appointment, businessName)
      break
    case 'update_status':
      result = await executeUpdateStatusAction(config || {}, appointment.id)
      break
    case 'assign_team':
      result = await executeAssignTeamAction(config || {}, appointment.id, appointment.userId)
      break
    case 'add_note':
      result = await executeAddNoteAction(config || {}, appointment.id)
      break
    case 'create_task':
      console.log(`[Workflow:CreateTask] Workflow ${workflowId}: Would create follow-up task for ${appointment.customerName}`)
      result = { success: true }
      break
    default:
      result = { success: false, error: `Unknown action type: ${actionType}` }
  }

  try {
    await db.insert(workflowLogs).values({
      workflowId,
      userId: appointment.userId,
      appointmentId: appointment.id,
      trigger,
      actionType,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error || null,
      executedAt: new Date(),
    })
  } catch (e) {
    console.error('[Workflow] Failed to write workflow log:', e)
  }
}

export async function getWorkflowStats(userId: string) {
  const allWorkflows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, userId))

  const activeCount = allWorkflows.filter((w: typeof allWorkflows[number]) => w.isActive).length
  const disabledCount = allWorkflows.filter((w: typeof allWorkflows[number]) => !w.isActive).length

  const logs = await db
    .select()
    .from(workflowLogs)
    .where(eq(workflowLogs.userId, userId))

  const emailsSent = logs.filter((l: typeof logs[number]) => l.actionType === 'email' && l.status === 'success').length
  const smsSent = logs.filter((l: typeof logs[number]) => l.actionType === 'sms' && l.status === 'success').length
  const successful = logs.filter((l: typeof logs[number]) => l.status === 'success').length
  const failed = logs.filter((l: typeof logs[number]) => l.status === 'failed').length

  return {
    totalWorkflows: allWorkflows.length,
    activeWorkflows: activeCount,
    disabledWorkflows: disabledCount,
    emailsSent,
    smsSent,
    successfulExecutions: successful,
    failedExecutions: failed,
  }
}
