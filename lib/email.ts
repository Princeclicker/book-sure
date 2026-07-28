import nodemailer from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface ConfirmationEmailParams {
  to: string
  customerName: string
  businessName: string
  date: string
  time: string
  duration: number
  dashboardLink: string | null
  manageLink: string | null
  notes: string | null
  clientToken: string | null
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: { user, pass },
  })
}

export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<boolean> {
  const { to, customerName, businessName, date, time, duration, dashboardLink, manageLink, notes, clientToken } = params

  const transporter = getTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com'

  if (!clientToken) {
    console.error('[Email] Cannot send confirmation email — missing clientToken for', to)
    return false
  }

  if (!transporter) {
    console.log('[Email] SMTP not configured. Would send confirmation to:', to)
    return false
  }

  const clientUrl = dashboardLink || manageLink || APP_URL
  console.log('[Email] Prepared email:', { to, dashboardLink, manageLink, clientUrl })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .details table { width: 100%; }
    .details td { padding: 8px; }
    .details td:first-child { font-weight: bold; width: 100px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px 0 0; }
    .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmed! ✅</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${customerName}</strong>,</p>
      <p>Your appointment with <strong>${businessName}</strong> has been confirmed.</p>

      <div class="details">
        <table>
          <tr><td>📅 Date:</td><td>${date}</td></tr>
          <tr><td>⏰ Time:</td><td>${time}</td></tr>
          <tr><td>⏱️ Duration:</td><td>${duration} minutes</td></tr>
          ${notes ? `<tr><td>📝 Notes:</td><td>${notes}</td></tr>` : ''}
        </table>
      </div>

      <div style="text-align: center;">
        <a href="${clientUrl}" class="button">View / Edit Appointment</a>
      </div>

      ${dashboardLink ? `
      <p style="margin-top: 16px; text-align: center;">
        <a href="${dashboardLink}" style="color: #4CAF50;">Manage all your appointments</a>
      </p>` : ''}

      <p style="margin-top: 20px;">Need to make changes? Use the options above to reschedule or cancel.</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Confirmed: ${businessName} – ${date} at ${time}`,
      html,
    })
    return true
  } catch (error) {
    console.error('[Email] SMTP send error:', error)
    return false
  }
}
