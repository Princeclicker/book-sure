import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

let devDbRef: any = null
let devAuthSchemaRef: any = null
if (isDev) {
  const sqlite = require('@/lib/db/sqlite')
  devDbRef = sqlite.devDb
  devAuthSchemaRef = sqlite.devAuthSchema
}

export const auth = betterAuth({
  database: isDev
    ? drizzleAdapter(devDbRef, { provider: 'sqlite', schema: devAuthSchemaRef })
    : drizzleAdapter(db, { provider: 'pg' }),
  secret:
    process.env.BETTER_AUTH_SECRET ?? (isDev ? 'dev-secret-at-least-32-characters-long!!' : undefined),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    ...(isDev ? ['http://localhost:3000'] : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'lax' as const,
            secure: false,
          },
        },
      }
    : {}),
})
