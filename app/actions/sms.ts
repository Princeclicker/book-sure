'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { appointments } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

interface SMSConfig {
  provider: 'twilio' | 'mtn' | 'airtel'
  accountSid?: string
  authToken?: string
  phoneNumber?: string
  apiKey?: string
  mtnApiKey?: string
  mtnApiSecret?: string
  airtelApiKey?: string
  airtelApiSecret?: string
}

/**
 * Send SMS via Twilio
 */
export async function sendSMSViaTwilio(
  toNumber: string,
  message: string,
  config: { accountSid: string; authToken: string; fromNumber: string }
) {
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        To: toNumber,
        From: config.fromNumber,
        Body: message,
      }).toString(),
    })

    if (!response.ok) {
      throw new Error('Twilio API error')
    }

    return await response.json()
  } catch (error) {
    console.error('[v0] Twilio SMS error:', error)
    throw error
  }
}

/**
 * Send SMS via MTN (Uganda, other African countries)
 */
export async function sendSMSViaMTN(
  toNumber: string,
  message: string,
  config: { apiKey: string; apiSecret: string }
) {
  try {
    const response = await fetch('https://mtnapi.mtnsms.co.ug/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
      },
      body: JSON.stringify({
        to: toNumber,
        text: message,
        type: 'text',
      }),
    })

    if (!response.ok) {
      throw new Error('MTN SMS API error')
    }

    return await response.json()
  } catch (error) {
    console.error('[v0] MTN SMS error:', error)
    throw error
  }
}

/**
 * Send SMS via Airtel (Multiple African countries)
 */
export async function sendSMSViaAirtel(
  toNumber: string,
  message: string,
  config: { apiKey: string; apiSecret: string }
) {
  try {
    const response = await fetch('https://api.airtelapi.com/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        recipient: toNumber,
        message: message,
      }),
    })

    if (!response.ok) {
      throw new Error('Airtel SMS API error')
    }

    return await response.json()
  } catch (error) {
    console.error('[v0] Airtel SMS error:', error)
    throw error
  }
}

/**
 * Send appointment confirmation SMS to customer
 */
export async function sendAppointmentConfirmation(
  appointmentId: number,
  customerPhone: string,
  config: SMSConfig
) {
  const userId = await getUserId()

  const appointment = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1)

  if (!appointment.length || appointment[0].userId !== userId) {
    throw new Error('Appointment not found')
  }

  const apt = appointment[0]
  const dateTime = apt.eventStart.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const message = `Your appointment has been confirmed for ${dateTime}. We look forward to seeing you!`

  switch (config.provider) {
    case 'twilio':
      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        throw new Error('Twilio configuration incomplete')
      }
      return sendSMSViaTwilio(customerPhone, message, {
        accountSid: config.accountSid,
        authToken: config.authToken,
        fromNumber: config.phoneNumber,
      })

    case 'mtn':
      if (!config.mtnApiKey || !config.mtnApiSecret) {
        throw new Error('MTN configuration incomplete')
      }
      return sendSMSViaMTN(customerPhone, message, {
        apiKey: config.mtnApiKey,
        apiSecret: config.mtnApiSecret,
      })

    case 'airtel':
      if (!config.airtelApiKey || !config.airtelApiSecret) {
        throw new Error('Airtel configuration incomplete')
      }
      return sendSMSViaAirtel(customerPhone, message, {
        apiKey: config.airtelApiKey,
        apiSecret: config.airtelApiSecret,
      })

    default:
      throw new Error('Unknown SMS provider')
  }
}

/**
 * Send appointment reminder SMS (1 hour before)
 */
export async function sendAppointmentReminder(
  appointmentId: number,
  customerPhone: string,
  config: SMSConfig
) {
  const userId = await getUserId()

  const appointment = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1)

  if (!appointment.length || appointment[0].userId !== userId) {
    throw new Error('Appointment not found')
  }

  const apt = appointment[0]
  const time = apt.eventStart.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const message = `Reminder: Your appointment is in 1 hour at ${time}. See you soon!`

  switch (config.provider) {
    case 'twilio':
      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        throw new Error('Twilio configuration incomplete')
      }
      return sendSMSViaTwilio(customerPhone, message, {
        accountSid: config.accountSid,
        authToken: config.authToken,
        fromNumber: config.phoneNumber,
      })

    case 'mtn':
      if (!config.mtnApiKey || !config.mtnApiSecret) {
        throw new Error('MTN configuration incomplete')
      }
      return sendSMSViaMTN(customerPhone, message, {
        apiKey: config.mtnApiKey,
        apiSecret: config.mtnApiSecret,
      })

    case 'airtel':
      if (!config.airtelApiKey || !config.airtelApiSecret) {
        throw new Error('Airtel configuration incomplete')
      }
      return sendSMSViaAirtel(customerPhone, message, {
        apiKey: config.airtelApiKey,
        apiSecret: config.airtelApiSecret,
      })

    default:
      throw new Error('Unknown SMS provider')
  }
}

/**
 * Send appointment cancellation SMS
 */
export async function sendAppointmentCancellation(
  appointmentId: number,
  customerPhone: string,
  reason: string,
  config: SMSConfig
) {
  const userId = await getUserId()

  const appointment = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1)

  if (!appointment.length || appointment[0].userId !== userId) {
    throw new Error('Appointment not found')
  }

  const message = `Your appointment has been cancelled. ${reason ? `Reason: ${reason}` : 'Please contact us if you have any questions.'}`

  switch (config.provider) {
    case 'twilio':
      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        throw new Error('Twilio configuration incomplete')
      }
      return sendSMSViaTwilio(customerPhone, message, {
        accountSid: config.accountSid,
        authToken: config.authToken,
        fromNumber: config.phoneNumber,
      })

    case 'mtn':
      if (!config.mtnApiKey || !config.mtnApiSecret) {
        throw new Error('MTN configuration incomplete')
      }
      return sendSMSViaMTN(customerPhone, message, {
        apiKey: config.mtnApiKey,
        apiSecret: config.mtnApiSecret,
      })

    case 'airtel':
      if (!config.airtelApiKey || !config.airtelApiSecret) {
        throw new Error('Airtel configuration incomplete')
      }
      return sendSMSViaAirtel(customerPhone, message, {
        apiKey: config.airtelApiKey,
        apiSecret: config.airtelApiSecret,
      })

    default:
      throw new Error('Unknown SMS provider')
  }
}
