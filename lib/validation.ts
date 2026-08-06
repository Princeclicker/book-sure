import { EMAIL_REGEX, DISPOSABLE_DOMAINS } from '@/lib/email-verification'

export interface ValidateEmailOptions {
  allowDisposable?: boolean
}

export function validateName(name: unknown): string | null {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'Name is required'
  }
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters'
  }
  if (trimmed.length > 50) {
    return 'Name must be 50 characters or fewer'
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return 'Name contains invalid characters'
  }
  return null
}

export function validateEmail(email: unknown, options: ValidateEmailOptions = {}): string | null {
  if (typeof email !== 'string' || email.trim().length === 0) {
    return 'Email is required'
  }
  const clean = email.toLowerCase().trim()
  if (clean.length > 254) {
    return 'Email address is too long'
  }
  if (!EMAIL_REGEX.test(clean)) {
    return 'Please enter a valid email address'
  }
  if (!options.allowDisposable) {
    const domain = clean.split('@')[1]
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return 'Temporary email addresses are not allowed. Please use a real email address.'
    }
  }
  return null
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer'
  }
  return null
}
