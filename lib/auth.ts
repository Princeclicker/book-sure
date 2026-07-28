import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { pool } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { devDb, devAuthSchema } from '@/lib/db/sqlite'

const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

export const auth = betterAuth({
  database: isDev
    ? drizzleAdapter(devDb, { provider: 'sqlite', schema: devAuthSchema })
    : drizzleAdapter(pool, { provider: 'pg', schema }),
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
