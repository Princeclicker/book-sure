import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@example.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendVerificationCodeEmail(email: string, code: string): Promise<boolean> {
  const transporter = getTransporter()
  const subject = 'Your verification code'
  const text = `Your verification code is: ${code}\n\nEnter this code in the booking form to confirm your email address.\n\nThis code expires in 10 minutes.`
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">Enter this code in the booking form to confirm your email address. This code expires in 10 minutes.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">If you didn't request this code, you can ignore this email.</p>
    </div>
  `

  if (!transporter) {
    console.log('')
    console.log('╔══════════════════════════════════════════════╗')
    console.log('║         EMAIL VERIFICATION CODE             ║')
    console.log(`║  To: ${email.padEnd(38)}║`)
    console.log(`║  Code: ${code.padEnd(36)}║`)
    console.log('╚══════════════════════════════════════════════╝')
    console.log('')
    console.log('  SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS')
    console.log('  in .env.local to send real emails.')
    console.log('')
    return true
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return false
  }
}

export async function sendAuthVerificationEmail(email: string, url: string, name?: string | null): Promise<boolean> {
  const transporter = getTransporter()
  const subject = 'Confirm your email address'
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const text = `${greeting}

Thanks for creating a BookSure account. Please confirm your email address by clicking the link below:

${url}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.`
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Confirm your email address</h2>
      <p>${greeting}</p>
      <p>Thanks for creating a BookSure account. Please confirm your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify my email</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${url}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    </div>
  `

  if (!transporter) {
    console.log('')
    console.log('╔══════════════════════════════════════════════════╗')
    console.log('║      ACCOUNT EMAIL VERIFICATION LINK             ║')
    console.log(`║  To: ${email.padEnd(45)}║`)
    console.log(`║  URL: ${url.padEnd(43)}║`)
    console.log('╚══════════════════════════════════════════════════╝')
    console.log('')
    console.log('  SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS')
    console.log('  in .env.local to send real emails.')
    console.log('')
    return true
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return false
  }
}
