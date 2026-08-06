import { betterAuth, APIError } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { validateName, validateEmail, validatePassword } from '@/lib/validation'
import { sendAuthVerificationEmail } from '@/lib/email-sender'
const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

let devDbRef: any = null
let devAuthSchemaRef: any = null
if (isDev) {
  const sqlite = require('@/lib/db/sqlite')
  devDbRef = sqlite.devDb
  devAuthSchemaRef = sqlite.devAuthSchema
}

const validateAuthInput = createAuthMiddleware(async (ctx) => {
  const body = (ctx.body ?? {}) as Record<string, unknown>

  if (ctx.path === '/sign-up/email') {
    const nameError = validateName(body.name)
    if (nameError) throw new APIError('BAD_REQUEST', { message: nameError })

    const emailError = validateEmail(body.email)
    if (emailError) throw new APIError('BAD_REQUEST', { message: emailError })

    const passwordError = validatePassword(body.password)
    if (passwordError) throw new APIError('BAD_REQUEST', { message: passwordError })
  }

  if (ctx.path === '/sign-in/email') {
    const emailError = validateEmail(body.email, { allowDisposable: true })
    if (emailError) throw new APIError('BAD_REQUEST', { message: emailError })

    if (typeof body.password !== 'string' || body.password.length === 0) {
      throw new APIError('BAD_REQUEST', { message: 'Password is required' })
    }

    // Block suspended accounts at sign-in.
    try {
      const found = await ctx.context.internalAdapter.findUserByEmail(
        String(body.email).toLowerCase()
      )
      if (found?.user?.suspended) {
        throw new APIError('FORBIDDEN', { message: 'This account has been suspended.' })
      }
    } catch (e) {
      if (e instanceof APIError) throw e
    }
  }
})

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
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, token }) => {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'http://localhost:3000'
      const url = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`
      await sendAuthVerificationEmail(user.email, url, user.name)
    },
  },
  hooks: {
    before: validateAuthInput,
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
