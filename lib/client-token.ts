import crypto from 'node:crypto'

const SALT = process.env.CLIENT_TOKEN_SALT || 'default-dev-salt-change-in-production'

export function generateClientToken(identifier: string, businessSlug?: string): string {
  return crypto
    .createHash('sha256')
    .update(`${identifier}${businessSlug || ''}${SALT}`)
    .digest('hex')
}
