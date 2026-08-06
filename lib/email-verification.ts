import { promises as dns } from 'dns'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
  'mailnator.com', 'getairmail.com', 'temp-mail.org', 'fakeinbox.com',
  'mailexpire.com', 'mailcatch.com', 'spambox.us', 'tempr.email',
])

export const ROLE_BASED_PREFIXES = [
  'admin', 'info', 'support', 'sales', 'contact', 'help', 'noreply',
  'no-reply', 'webmaster', 'postmaster', 'marketing', 'billing',
  'abuse', 'team', 'hello', 'inquiries',
]

export type EmailStatus = 'valid' | 'invalid' | 'risky'

export interface EmailVerificationResult {
  status: EmailStatus
  reason?: string
}

export async function verifyEmailStatus(email: string): Promise<EmailVerificationResult> {
  const clean = email.toLowerCase().trim()

  if (!EMAIL_REGEX.test(clean)) {
    return { status: 'invalid', reason: 'Please enter a valid email address' }
  }

  if (clean.length > 254) {
    return { status: 'invalid', reason: 'Email address is too long' }
  }

  const domain = clean.split('@')[1]

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { status: 'risky', reason: 'Temporary email addresses may not receive your confirmation. Please verify your email.' }
  }

  const localPart = clean.split('@')[0]
  if (ROLE_BASED_PREFIXES.includes(localPart)) {
    return { status: 'risky', reason: 'Role-based email addresses may not reach you directly. Please verify your email.' }
  }

  let hasMx = false
  let dnsError = false
  try {
    const mxRecords = await dns.resolveMx(domain)
    hasMx = mxRecords.length > 0
  } catch {
    dnsError = true
  }

  if (!hasMx && !dnsError) {
    return { status: 'risky', reason: 'This email domain does not seem to accept emails. Please confirm with a verification code.' }
  }

  const apiResult = await verifyViaApi(clean, domain)
  if (apiResult !== null) {
    return apiResult
  }

  return { status: 'risky', reason: 'We could not automatically verify this email. Please verify with a confirmation code.' }
}

async function verifyViaApi(email: string, domain: string): Promise<EmailVerificationResult | null> {
  try {
    const res = await fetch(`https://disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      format?: boolean
      disposable?: boolean
      dns?: boolean
      status?: boolean | null
    }

    if (data.format === false) {
      return { status: 'invalid', reason: 'Invalid email format' }
    }

    if (data.disposable === true) {
      return { status: 'risky', reason: 'Temporary email addresses may not receive your confirmation. Please verify your email.' }
    }

    if (data.dns === false) {
      return { status: 'invalid', reason: 'This email domain cannot receive emails. Please check your address.' }
    }

    if (data.status === true) {
      return { status: 'valid' }
    }

    // status = false, null, or undefined
    if (GMAIL_DOMAINS.has(domain)) {
      return { status: 'valid' }
    }

    return { status: 'risky', reason: 'We could not automatically verify this email. Please verify with a confirmation code.' }
  } catch {
    return null
  }
}
