import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import crypto from 'node:crypto'

let _sqlite: any = null
let _devDb: BetterSQLite3Database | null = null

function getSQLite(): any {
  if (_sqlite) return _sqlite
  const _require = eval('require')
  const Database = _require('better-sqlite3')
  _sqlite = new Database('data/booksure-dev.db')
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')
  initSchema(_sqlite)
  return _sqlite
}

function initSchema(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "emailVerified" integer NOT NULL DEFAULT 0,
      "image" text,
      "role" text DEFAULT 'user',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY NOT NULL,
      "expiresAt" integer NOT NULL,
      "token" text NOT NULL UNIQUE,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL,
      "ipAddress" text,
      "userAgent" text,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY NOT NULL,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" integer,
      "refreshTokenExpiresAt" integer,
      "scope" text,
      "password" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expiresAt" integer NOT NULL,
      "createdAt" integer,
      "updatedAt" integer
    );

    CREATE TABLE IF NOT EXISTS "google_calendars" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "calendarId" text NOT NULL UNIQUE,
      "accessToken" text NOT NULL,
      "refreshToken" text NOT NULL,
      "expiresAt" integer NOT NULL,
      "timezone" text DEFAULT 'UTC',
      "workingHoursStart" integer DEFAULT 9,
      "workingHoursEnd" integer DEFAULT 17,
      "bufferMinutes" integer DEFAULT 15,
      "lunchBreakStart" integer DEFAULT 12,
      "lunchBreakEnd" integer DEFAULT 13,
      "workingDays" text DEFAULT '[1,2,3,4,5]',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "appointments" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "calendarId" integer NOT NULL,
      "googleEventId" text,
      "customerName" text NOT NULL,
      "customerEmail" text NOT NULL,
      "customerPhone" text NOT NULL,
      "eventStart" integer NOT NULL,
      "eventEnd" integer NOT NULL,
      "duration" integer NOT NULL,
      "status" text DEFAULT 'confirmed',
      "notes" text,
      "manage_token" text UNIQUE,
      "client_token" text,
      "notes_updated_at" integer,
      "rescheduled_from" integer,
      "confirmationSent" integer DEFAULT 0,
      "reminderSent" integer DEFAULT 0,
      "cancelledViaSms" integer DEFAULT 0,
      "email_sent" integer DEFAULT 0,
      "reminder_24h_email_sent" integer DEFAULT 0,
      "reminder_1h_email_sent" integer DEFAULT 0,
      "thank_you_email_sent" integer DEFAULT 0,
      "feedback_email_sent" integer DEFAULT 0,
      "cancelled_email_sent" integer DEFAULT 0,
      "rescheduled_email_sent" integer DEFAULT 0,
      "new_booking_notification_sent" integer DEFAULT 0,
      "unsubscribed" integer DEFAULT 0,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "manual_blocks" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "calendarId" integer NOT NULL,
      "blockStart" integer NOT NULL,
      "blockEnd" integer NOT NULL,
      "reason" text,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "businesses" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "businessName" text NOT NULL,
      "businessSlug" text UNIQUE,
      "logoUrl" text,
      "brandColor" text DEFAULT '#3b82f6',
      "smsProvider" text DEFAULT 'twilio',
      "requireEmail" integer DEFAULT 0,
      "smsSenderName" text,
      "maxAdvanceBooking" integer DEFAULT 30,
      "durationOptions" text DEFAULT '[15,30,45,60]',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "email_verification_codes" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "email" text NOT NULL,
      "code" text NOT NULL,
      "expiresAt" integer NOT NULL,
      "used" integer DEFAULT 0,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "teams" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "teamName" text NOT NULL,
      "teamColor" text DEFAULT '#3b82f6',
      "description" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "team_members" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "teamId" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
      "memberName" text NOT NULL,
      "memberEmail" text NOT NULL,
      "memberPhone" text,
      "isActive" integer DEFAULT 1,
      "calendarId" integer,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "meeting_polls" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "duration" integer DEFAULT 30,
      "proposedDates" text NOT NULL,
      "timeStart" integer DEFAULT 9,
      "timeEnd" integer DEFAULT 17,
      "status" text DEFAULT 'open',
      "shareToken" text UNIQUE,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "poll_votes" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "pollId" integer NOT NULL REFERENCES "meeting_polls"("id") ON DELETE CASCADE,
      "voterName" text NOT NULL,
      "voterEmail" text,
      "selectedSlots" text NOT NULL,
      "notes" text,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "workflows" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "trigger" text NOT NULL,
      "triggerMinutes" integer DEFAULT 0,
      "actionType" text NOT NULL DEFAULT 'email',
      "subject" text,
      "message" text DEFAULT '',
      "isActive" integer DEFAULT 1,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "workflow_actions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "workflowId" integer NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
      "actionType" text NOT NULL,
      "subject" text,
      "message" text DEFAULT '',
      "config" text DEFAULT '{}',
      "sortOrder" integer DEFAULT 0,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "workflow_logs" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "workflowId" integer NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
      "userId" text NOT NULL,
      "appointmentId" integer,
      "trigger" text NOT NULL,
      "actionType" text NOT NULL,
      "customerName" text,
      "customerEmail" text,
      "status" text NOT NULL DEFAULT 'success',
      "errorMessage" text,
      "executedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "routing_forms" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "title" text NOT NULL,
      "fields" text DEFAULT '[]',
      "teamId" integer REFERENCES "teams"("id"),
      "redirectUrl" text,
      "isActive" integer DEFAULT 1,
      "shareToken" text UNIQUE,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "form_submissions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "formId" integer NOT NULL REFERENCES "routing_forms"("id") ON DELETE CASCADE,
      "data" text NOT NULL,
      "assignedTo" text,
      "status" text DEFAULT 'new',
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "email_log" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "appointmentId" integer NOT NULL,
      "userId" text NOT NULL,
      "emailType" text NOT NULL,
      "recipientEmail" text NOT NULL,
      "subject" text NOT NULL,
      "status" text NOT NULL DEFAULT 'pending',
      "errorMessage" text,
      "metadata" text,
      "sentAt" integer,
      "retryCount" integer DEFAULT 0,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "business_profiles" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "profession" text DEFAULT 'freelancer',
      "businessDescription" text,
      "location" text,
      "timezone" text DEFAULT 'UTC',
      "currency" text DEFAULT 'USD',
      "teamSize" integer DEFAULT 1,
      "onboardingCompleted" integer DEFAULT 0,
      "onboardingStep" integer DEFAULT 0,
      "enabledModules" text DEFAULT '[]',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "contacts" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "name" text NOT NULL,
      "email" text,
      "phone" text,
      "company" text,
      "profession" text,
      "tags" text DEFAULT '[]',
      "source" text DEFAULT 'manual',
      "assignedTo" text,
      "status" text DEFAULT 'lead',
      "totalAppointments" integer DEFAULT 0,
      "totalRevenue" integer DEFAULT 0,
      "lastContactAt" integer,
      "firstContactAt" integer,
      "customFields" text DEFAULT '{}',
      "notes" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "contact_timeline" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "contactId" integer NOT NULL,
      "userId" text NOT NULL,
      "eventType" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "metadata" text DEFAULT '{}',
      "linkedAppointmentId" integer,
      "linkedInvoiceId" integer,
      "linkedTaskId" integer,
      "linkedOpportunityId" integer,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tasks" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "priority" text DEFAULT 'medium',
      "status" text DEFAULT 'todo',
      "dueDate" integer,
      "assignedTo" text,
      "contactId" integer,
      "linkedAppointmentId" integer,
      "linkedInvoiceId" integer,
      "linkedOpportunityId" integer,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "opportunities" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "value" integer DEFAULT 0,
      "currency" text DEFAULT 'USD',
      "contactId" integer,
      "stage" text DEFAULT 'lead',
      "probability" integer DEFAULT 0,
      "expectedCloseDate" integer,
      "actualCloseDate" integer,
      "lostReason" text,
      "assignedTo" text,
      "tags" text DEFAULT '[]',
      "customFields" text DEFAULT '{}',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "invoices" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "invoiceNumber" text NOT NULL,
      "contactId" integer,
      "linkedAppointmentId" integer,
      "linkedOpportunityId" integer,
      "status" text DEFAULT 'draft',
      "subtotal" integer DEFAULT 0,
      "taxRate" integer DEFAULT 0,
      "taxAmount" integer DEFAULT 0,
      "total" integer DEFAULT 0,
      "currency" text DEFAULT 'USD',
      "dueDate" integer,
      "paidAt" integer,
      "notes" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "invoice_items" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "invoiceId" integer NOT NULL,
      "description" text NOT NULL,
      "quantity" integer DEFAULT 1,
      "unitPrice" integer DEFAULT 0,
      "amount" integer DEFAULT 0,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "payments" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "invoiceId" integer NOT NULL,
      "amount" integer NOT NULL,
      "paymentMethod" text DEFAULT 'manual',
      "reference" text,
      "notes" text,
      "paidAt" integer NOT NULL,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "ai_providers" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "providerType" text NOT NULL,
      "apiKey" text,
      "isActive" integer DEFAULT 0,
      "config" text DEFAULT '{}',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "ai_insights" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "userId" text NOT NULL,
      "insightType" text NOT NULL,
      "title" text NOT NULL,
      "description" text NOT NULL,
      "priority" text DEFAULT 'medium',
      "actionType" text,
      "actionUrl" text,
      "actionLabel" text,
      "isRead" integer DEFAULT 0,
      "isDismissed" integer DEFAULT 0,
      "metadata" text DEFAULT '{}',
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "feature_flags" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "key" text NOT NULL UNIQUE,
      "label" text NOT NULL,
      "description" text,
      "category" text NOT NULL DEFAULT 'general',
      "enabled" integer NOT NULL DEFAULT 0,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "professions" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "description" text,
      "isArchived" integer NOT NULL DEFAULT 0,
      "config" text DEFAULT '{}',
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "actorUserId" text,
      "actorEmail" text,
      "action" text NOT NULL,
      "targetType" text,
      "targetId" text,
      "metadata" text DEFAULT '{}',
      "ipAddress" text,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "platform_notifications" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "type" text NOT NULL,
      "severity" text NOT NULL DEFAULT 'info',
      "title" text NOT NULL,
      "message" text,
      "isRead" integer NOT NULL DEFAULT 0,
      "createdAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "business_meta" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "businessId" integer NOT NULL UNIQUE,
      "status" text NOT NULL DEFAULT 'active',
      "plan" text NOT NULL DEFAULT 'free',
      "planStatus" text NOT NULL DEFAULT 'active',
      "planRenewsAt" integer,
      "storageBytes" integer NOT NULL DEFAULT 0,
      "aiUsageTokens" integer NOT NULL DEFAULT 0,
      "lastActiveAt" integer,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "platform_settings" (
      "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      "key" text NOT NULL UNIQUE,
      "value" text NOT NULL,
      "updatedAt" integer NOT NULL
    );
  `)

  const existingColumns = sqlite.pragma('table_info(appointments)') as { name: string }[]
  const existingNames = new Set(existingColumns.map(c => c.name))

  const userColumns = sqlite.pragma('table_info(user)') as { name: string }[]
  if (!userColumns.some(c => c.name === 'suspended')) {
    sqlite.exec(`ALTER TABLE "user" ADD COLUMN "suspended" integer NOT NULL DEFAULT 0;`)
  }

  const professionsColumns = sqlite.pragma('table_info(professions)') as { name: string }[]
  if (professionsColumns.length && !professionsColumns.some(c => c.name === 'isCustom')) {
    sqlite.exec(`ALTER TABLE "professions" ADD COLUMN "isCustom" integer NOT NULL DEFAULT 0;`)
  }

  if (!existingNames.has('manage_token')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "manage_token" text;`)
  }
  if (!existingNames.has('notes_updated_at')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "notes_updated_at" integer;`)
  }
  if (!existingNames.has('rescheduled_from')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "rescheduled_from" integer;`)
  }
  if (!existingNames.has('client_token')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "client_token" text;`)
  }
  if (!existingNames.has('googleEventId')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "googleEventId" text;`)
  }
  if (!existingNames.has('email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('reminder_24h_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "reminder_24h_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('reminder_1h_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "reminder_1h_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('thank_you_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "thank_you_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('feedback_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "feedback_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('cancelled_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "cancelled_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('rescheduled_email_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "rescheduled_email_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('new_booking_notification_sent')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "new_booking_notification_sent" integer DEFAULT 0;`)
  }
  if (!existingNames.has('unsubscribed')) {
    sqlite.exec(`ALTER TABLE "appointments" ADD COLUMN "unsubscribed" integer DEFAULT 0;`)
  }

  const bizColumns = sqlite.pragma('table_info(businesses)') as { name: string }[]
  const bizNames = new Set(bizColumns.map(c => c.name))
  if (!bizNames.has('durationOptions')) {
    sqlite.exec(`ALTER TABLE "businesses" ADD COLUMN "durationOptions" text DEFAULT '[15,30,45,60]';`)
  }

  const wfColumns = sqlite.pragma('table_info(workflows)') as { name: string }[]
  const wfNames = new Set(wfColumns.map(c => c.name))
  if (!wfNames.has('description')) {
    sqlite.exec(`ALTER TABLE "workflows" ADD COLUMN "description" text;`)
  }

  const SALT = process.env.CLIENT_TOKEN_SALT || 'default-dev-salt-change-in-production'
  const toBackfill = sqlite.prepare(
    `SELECT id, customerEmail, client_token FROM appointments WHERE customerEmail IS NOT NULL AND customerEmail != ''`
  ).all() as { id: number; customerEmail: string; client_token: string | null }[]

  let backfilled = 0
  for (const row of toBackfill) {
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${row.customerEmail.toLowerCase().trim()}${SALT}`)
      .digest('hex')
    if (row.client_token === expectedHash) continue
    sqlite.prepare(`UPDATE appointments SET client_token = ? WHERE id = ?`).run(expectedHash, row.id)
    backfilled++
  }

  if (backfilled > 0) {
    console.log(`[migration] Backfilled client_token for ${backfilled} existing appointment(s)`)
  }
}

export function getDevDb(): BetterSQLite3Database {
  if (_devDb) return _devDb
  const sqlite = getSQLite()
  const _require = eval('require')
  const { drizzle } = _require('drizzle-orm/better-sqlite3')
  _devDb = drizzle(sqlite)
  return _devDb
}

// Lazy proxy so devDb can be used as a direct import but only initializes on first access
export const devDb = new Proxy({} as BetterSQLite3Database, {
  get(_, prop) {
    return (getDevDb() as any)[prop]
  },
  set(_, prop, value) {
    ;(getDevDb() as any)[prop] = value
    return true
  },
  has(_, prop) {
    return prop in getDevDb()
  },
  ownKeys() {
    return Reflect.ownKeys(getDevDb())
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true }
  },
})

export const sqliteUser = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').default('user'),
  suspended: integer('suspended', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteSession = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => sqliteUser.id, { onDelete: 'cascade' }),
})

export const sqliteAccount = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => sqliteUser.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteVerification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteGoogleCalendars = sqliteTable('google_calendars', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  calendarId: text('calendarId').notNull().unique(),
  accessToken: text('accessToken').notNull(),
  refreshToken: text('refreshToken').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  timezone: text('timezone').default('UTC'),
  workingHoursStart: integer('workingHoursStart').default(9),
  workingHoursEnd: integer('workingHoursEnd').default(17),
  bufferMinutes: integer('bufferMinutes').default(15),
  lunchBreakStart: integer('lunchBreakStart').default(12),
  lunchBreakEnd: integer('lunchBreakEnd').default(13),
  workingDays: text('workingDays').default('[1,2,3,4,5]'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteAppointments = sqliteTable('appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  calendarId: integer('calendarId').notNull(),
  googleEventId: text('googleEventId'),
  customerName: text('customerName').notNull(),
  customerEmail: text('customerEmail').notNull(),
  customerPhone: text('customerPhone').notNull(),
  eventStart: integer('eventStart', { mode: 'timestamp_ms' }).notNull(),
  eventEnd: integer('eventEnd', { mode: 'timestamp_ms' }).notNull(),
  duration: integer('duration').notNull(),
  status: text('status').default('confirmed'),
  notes: text('notes'),
  manageToken: text('manage_token').unique(),
  clientToken: text('client_token'),
  notesUpdatedAt: integer('notes_updated_at', { mode: 'timestamp_ms' }),
  rescheduledFrom: integer('rescheduled_from'),
  confirmationSent: integer('confirmationSent', { mode: 'boolean' }).default(false),
  reminderSent: integer('reminderSent', { mode: 'boolean' }).default(false),
  cancelledViaSms: integer('cancelledViaSms', { mode: 'boolean' }).default(false),
  emailSent: integer('email_sent', { mode: 'boolean' }).default(false),
  reminder24hEmailSent: integer('reminder_24h_email_sent', { mode: 'boolean' }).default(false),
  reminder1hEmailSent: integer('reminder_1h_email_sent', { mode: 'boolean' }).default(false),
  thankYouEmailSent: integer('thank_you_email_sent', { mode: 'boolean' }).default(false),
  feedbackEmailSent: integer('feedback_email_sent', { mode: 'boolean' }).default(false),
  cancelledEmailSent: integer('cancelled_email_sent', { mode: 'boolean' }).default(false),
  rescheduledEmailSent: integer('rescheduled_email_sent', { mode: 'boolean' }).default(false),
  newBookingNotificationSent: integer('new_booking_notification_sent', { mode: 'boolean' }).default(false),
  unsubscribed: integer('unsubscribed', { mode: 'boolean' }).default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteManualBlocks = sqliteTable('manual_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  calendarId: integer('calendarId').notNull(),
  blockStart: integer('blockStart', { mode: 'timestamp_ms' }).notNull(),
  blockEnd: integer('blockEnd', { mode: 'timestamp_ms' }).notNull(),
  reason: text('reason'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteBusinesses = sqliteTable('businesses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  businessName: text('businessName').notNull(),
  businessSlug: text('businessSlug').unique(),
  logoUrl: text('logoUrl'),
  brandColor: text('brandColor').default('#3b82f6'),
  smsProvider: text('smsProvider').default('twilio'),
  requireEmail: integer('requireEmail', { mode: 'boolean' }).default(false),
  smsSenderName: text('smsSenderName'),
  maxAdvanceBooking: integer('maxAdvanceBooking').default(30),
  durationOptions: text('durationOptions').default('[15,30,45,60]'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteEmailVerificationCodes = sqliteTable('email_verification_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteTeams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  teamName: text('teamName').notNull(),
  teamColor: text('teamColor').default('#3b82f6'),
  description: text('description'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteTeamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('teamId').notNull().references(() => sqliteTeams.id, { onDelete: 'cascade' }),
  memberName: text('memberName').notNull(),
  memberEmail: text('memberEmail').notNull(),
  memberPhone: text('memberPhone'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  calendarId: integer('calendarId'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteMeetingPolls = sqliteTable('meeting_polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration').default(30),
  proposedDates: text('proposedDates').notNull(),
  timeStart: integer('timeStart').default(9),
  timeEnd: integer('timeEnd').default(17),
  status: text('status').default('open'),
  shareToken: text('shareToken').unique(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqlitePollVotes = sqliteTable('poll_votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pollId: integer('pollId').notNull().references(() => sqliteMeetingPolls.id, { onDelete: 'cascade' }),
  voterName: text('voterName').notNull(),
  voterEmail: text('voterEmail'),
  selectedSlots: text('selectedSlots').notNull(),
  notes: text('notes'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteWorkflows = sqliteTable('workflows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger').notNull(),
  triggerMinutes: integer('triggerMinutes').default(0),
  actionType: text('actionType').notNull().default('email'),
  subject: text('subject'),
  message: text('message').default(''),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteWorkflowActions = sqliteTable('workflow_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workflowId: integer('workflowId').notNull().references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  actionType: text('actionType').notNull(),
  subject: text('subject'),
  message: text('message').default(''),
  config: text('config').default('{}'),
  sortOrder: integer('sortOrder').default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteWorkflowLogs = sqliteTable('workflow_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workflowId: integer('workflowId').notNull().references(() => sqliteWorkflows.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  appointmentId: integer('appointmentId'),
  trigger: text('trigger').notNull(),
  actionType: text('actionType').notNull(),
  customerName: text('customerName'),
  customerEmail: text('customerEmail'),
  status: text('status').notNull().default('success'),
  errorMessage: text('errorMessage'),
  executedAt: integer('executedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteRoutingForms = sqliteTable('routing_forms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  fields: text('fields').default('[]'),
  teamId: integer('teamId').references(() => sqliteTeams.id),
  redirectUrl: text('redirectUrl'),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  shareToken: text('shareToken').unique(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteFormSubmissions = sqliteTable('form_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  formId: integer('formId').notNull().references(() => sqliteRoutingForms.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
  assignedTo: text('assignedTo'),
  status: text('status').default('new'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteEmailLog = sqliteTable('email_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  appointmentId: integer('appointmentId').notNull(),
  userId: text('userId').notNull(),
  emailType: text('emailType').notNull(),
  recipientEmail: text('recipientEmail').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull().default('pending'),
  errorMessage: text('errorMessage'),
  metadata: text('metadata'),
  sentAt: integer('sentAt', { mode: 'timestamp_ms' }),
  retryCount: integer('retryCount').default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteBusinessProfiles = sqliteTable('business_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  profession: text('profession').default('freelancer'),
  businessDescription: text('businessDescription'),
  location: text('location'),
  timezone: text('timezone').default('UTC'),
  currency: text('currency').default('USD'),
  teamSize: integer('teamSize').default(1),
  onboardingCompleted: integer('onboardingCompleted', { mode: 'boolean' }).default(false),
  onboardingStep: integer('onboardingStep').default(0),
  enabledModules: text('enabledModules').default('[]'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteContacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  profession: text('profession'),
  tags: text('tags').default('[]'),
  source: text('source').default('manual'),
  assignedTo: text('assignedTo'),
  status: text('status').default('lead'),
  totalAppointments: integer('totalAppointments').default(0),
  totalRevenue: integer('totalRevenue').default(0),
  lastContactAt: integer('lastContactAt', { mode: 'timestamp_ms' }),
  firstContactAt: integer('firstContactAt', { mode: 'timestamp_ms' }),
  customFields: text('customFields').default('{}'),
  notes: text('notes'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteContactTimeline = sqliteTable('contact_timeline', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contactId: integer('contactId').notNull(),
  userId: text('userId').notNull(),
  eventType: text('eventType').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  metadata: text('metadata').default('{}'),
  linkedAppointmentId: integer('linkedAppointmentId'),
  linkedInvoiceId: integer('linkedInvoiceId'),
  linkedTaskId: integer('linkedTaskId'),
  linkedOpportunityId: integer('linkedOpportunityId'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteTasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').default('medium'),
  status: text('status').default('todo'),
  dueDate: integer('dueDate', { mode: 'timestamp_ms' }),
  assignedTo: text('assignedTo'),
  contactId: integer('contactId'),
  linkedAppointmentId: integer('linkedAppointmentId'),
  linkedInvoiceId: integer('linkedInvoiceId'),
  linkedOpportunityId: integer('linkedOpportunityId'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteOpportunities = sqliteTable('opportunities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  value: integer('value').default(0),
  currency: text('currency').default('USD'),
  contactId: integer('contactId'),
  stage: text('stage').default('lead'),
  probability: integer('probability').default(0),
  expectedCloseDate: integer('expectedCloseDate', { mode: 'timestamp_ms' }),
  actualCloseDate: integer('actualCloseDate', { mode: 'timestamp_ms' }),
  lostReason: text('lostReason'),
  assignedTo: text('assignedTo'),
  tags: text('tags').default('[]'),
  customFields: text('customFields').default('{}'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteInvoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  invoiceNumber: text('invoiceNumber').notNull(),
  contactId: integer('contactId'),
  linkedAppointmentId: integer('linkedAppointmentId'),
  linkedOpportunityId: integer('linkedOpportunityId'),
  status: text('status').default('draft'),
  subtotal: integer('subtotal').default(0),
  taxRate: integer('taxRate').default(0),
  taxAmount: integer('taxAmount').default(0),
  total: integer('total').default(0),
  currency: text('currency').default('USD'),
  dueDate: integer('dueDate', { mode: 'timestamp_ms' }),
  paidAt: integer('paidAt', { mode: 'timestamp_ms' }),
  notes: text('notes'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteInvoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoiceId').notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').default(1),
  unitPrice: integer('unitPrice').default(0),
  amount: integer('amount').default(0),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqlitePayments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  invoiceId: integer('invoiceId').notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('paymentMethod').default('manual'),
  reference: text('reference'),
  notes: text('notes'),
  paidAt: integer('paidAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteAiProviders = sqliteTable('ai_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  providerType: text('providerType').notNull(),
  apiKey: text('apiKey'),
  isActive: integer('isActive', { mode: 'boolean' }).default(false),
  config: text('config').default('{}'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteAiInsights = sqliteTable('ai_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  insightType: text('insightType').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').default('medium'),
  actionType: text('actionType'),
  actionUrl: text('actionUrl'),
  actionLabel: text('actionLabel'),
  isRead: integer('isRead', { mode: 'boolean' }).default(false),
  isDismissed: integer('isDismissed', { mode: 'boolean' }).default(false),
  metadata: text('metadata').default('{}'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteFeatureFlags = sqliteTable('feature_flags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  category: text('category').notNull().default('general'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteProfessions = sqliteTable('professions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    isArchived: integer('isArchived', { mode: 'boolean' }).notNull().default(false),
    isCustom: integer('isCustom', { mode: 'boolean' }).notNull().default(false),
    config: text('config').default('{}'),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  })

export const sqliteAuditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorUserId: text('actorUserId'),
  actorEmail: text('actorEmail'),
  action: text('action').notNull(),
  targetType: text('targetType'),
  targetId: text('targetId'),
  metadata: text('metadata').default('{}'),
  ipAddress: text('ipAddress'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqlitePlatformNotifications = sqliteTable('platform_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  severity: text('severity').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message'),
  isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqliteBusinessMeta = sqliteTable('business_meta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessId: integer('businessId').notNull().unique(),
  status: text('status').notNull().default('active'),
  plan: text('plan').notNull().default('free'),
  planStatus: text('planStatus').notNull().default('active'),
  planRenewsAt: integer('planRenewsAt', { mode: 'timestamp_ms' }),
  storageBytes: integer('storageBytes').notNull().default(0),
  aiUsageTokens: integer('aiUsageTokens').notNull().default(0),
  lastActiveAt: integer('lastActiveAt', { mode: 'timestamp_ms' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const sqlitePlatformSettings = sqliteTable('platform_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
})

export const devAuthSchema = {
  user: sqliteUser,
  session: sqliteSession,
  account: sqliteAccount,
  verification: sqliteVerification,
}

export const devFullSchema = {
  user: sqliteUser,
  session: sqliteSession,
  account: sqliteAccount,
  verification: sqliteVerification,
  googleCalendars: sqliteGoogleCalendars,
  appointments: sqliteAppointments,
  manualBlocks: sqliteManualBlocks,
  businesses: sqliteBusinesses,
  emailVerificationCodes: sqliteEmailVerificationCodes,
  teams: sqliteTeams,
  teamMembers: sqliteTeamMembers,
  meetingPolls: sqliteMeetingPolls,
  pollVotes: sqlitePollVotes,
  workflows: sqliteWorkflows,
  workflowActions: sqliteWorkflowActions,
  workflowLogs: sqliteWorkflowLogs,
  routingForms: sqliteRoutingForms,
  formSubmissions: sqliteFormSubmissions,
  emailLog: sqliteEmailLog,
  businessProfiles: sqliteBusinessProfiles,
  contacts: sqliteContacts,
  contactTimeline: sqliteContactTimeline,
  tasks: sqliteTasks,
  opportunities: sqliteOpportunities,
  invoices: sqliteInvoices,
  invoiceItems: sqliteInvoiceItems,
  payments: sqlitePayments,
  aiProviders: sqliteAiProviders,
  aiInsights: sqliteAiInsights,
  featureFlags: sqliteFeatureFlags,
  professions: sqliteProfessions,
  auditLogs: sqliteAuditLogs,
  platformNotifications: sqlitePlatformNotifications,
  businessMeta: sqliteBusinessMeta,
  platformSettings: sqlitePlatformSettings,
}
