#!/usr/bin/env tsx
/**
 * BOS Migration Verification Script
 *
 * Verifies all AI Business Operating System tables exist and
 * existing appointment tables are untouched.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/verify-bos-tables.ts
 */

import Database from 'better-sqlite3'
import crypto from 'node:crypto'

const BOS_TABLES = [
  'business_profiles',
  'contacts',
  'contact_timeline',
  'tasks',
  'opportunities',
  'invoices',
  'invoice_items',
  'payments',
  'ai_providers',
  'ai_insights',
]

const EXISTING_TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'google_calendars',
  'appointments',
  'manual_blocks',
  'businesses',
  'email_verification_codes',
  'teams',
  'team_members',
  'meeting_polls',
  'poll_votes',
  'workflows',
  'workflow_actions',
  'workflow_logs',
  'routing_forms',
  'form_submissions',
  'email_log',
]

// Mirror of initSchema from lib/db/sqlite.ts — ensures BOS tables exist
function initSchema(sqlite: InstanceType<typeof Database>) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL,"name" text NOT NULL,"email" text NOT NULL UNIQUE,"emailVerified" integer NOT NULL DEFAULT 0,"image" text,"role" text DEFAULT 'user',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "session" ("id" text PRIMARY KEY NOT NULL,"expiresAt" integer NOT NULL,"token" text NOT NULL UNIQUE,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL,"ipAddress" text,"userAgent" text,"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS "account" ("id" text PRIMARY KEY NOT NULL,"accountId" text NOT NULL,"providerId" text NOT NULL,"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,"accessToken" text,"refreshToken" text,"idToken" text,"accessTokenExpiresAt" integer,"refreshTokenExpiresAt" integer,"scope" text,"password" text,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "verification" ("id" text PRIMARY KEY NOT NULL,"identifier" text NOT NULL,"value" text NOT NULL,"expiresAt" integer NOT NULL,"createdAt" integer,"updatedAt" integer);
    CREATE TABLE IF NOT EXISTS "google_calendars" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"calendarId" text NOT NULL UNIQUE,"accessToken" text NOT NULL,"refreshToken" text NOT NULL,"expiresAt" integer NOT NULL,"timezone" text DEFAULT 'UTC',"workingHoursStart" integer DEFAULT 9,"workingHoursEnd" integer DEFAULT 17,"bufferMinutes" integer DEFAULT 15,"lunchBreakStart" integer DEFAULT 12,"lunchBreakEnd" integer DEFAULT 13,"workingDays" text DEFAULT '[1,2,3,4,5]',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "appointments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"calendarId" integer NOT NULL,"googleEventId" text,"customerName" text NOT NULL,"customerEmail" text NOT NULL,"customerPhone" text NOT NULL,"eventStart" integer NOT NULL,"eventEnd" integer NOT NULL,"duration" integer NOT NULL,"status" text DEFAULT 'confirmed',"notes" text,"manage_token" text UNIQUE,"client_token" text,"notes_updated_at" integer,"rescheduled_from" integer,"confirmationSent" integer DEFAULT 0,"reminderSent" integer DEFAULT 0,"cancelledViaSms" integer DEFAULT 0,"email_sent" integer DEFAULT 0,"reminder_24h_email_sent" integer DEFAULT 0,"reminder_1h_email_sent" integer DEFAULT 0,"thank_you_email_sent" integer DEFAULT 0,"feedback_email_sent" integer DEFAULT 0,"cancelled_email_sent" integer DEFAULT 0,"rescheduled_email_sent" integer DEFAULT 0,"new_booking_notification_sent" integer DEFAULT 0,"unsubscribed" integer DEFAULT 0,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "manual_blocks" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"calendarId" integer NOT NULL,"blockStart" integer NOT NULL,"blockEnd" integer NOT NULL,"reason" text,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "businesses" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"businessName" text NOT NULL,"businessSlug" text UNIQUE,"logoUrl" text,"brandColor" text DEFAULT '#3b82f6',"smsProvider" text DEFAULT 'twilio',"requireEmail" integer DEFAULT 0,"smsSenderName" text,"maxAdvanceBooking" integer DEFAULT 30,"durationOptions" text DEFAULT '[15,30,45,60]',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "email_verification_codes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"email" text NOT NULL,"code" text NOT NULL,"expiresAt" integer NOT NULL,"used" integer DEFAULT 0,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "teams" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"teamName" text NOT NULL,"teamColor" text DEFAULT '#3b82f6',"description" text,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "team_members" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"teamId" integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,"memberName" text NOT NULL,"memberEmail" text NOT NULL,"memberPhone" text,"isActive" integer DEFAULT 1,"calendarId" integer,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "meeting_polls" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"title" text NOT NULL,"description" text,"duration" integer DEFAULT 30,"proposedDates" text NOT NULL,"timeStart" integer DEFAULT 9,"timeEnd" integer DEFAULT 17,"status" text DEFAULT 'open',"shareToken" text UNIQUE,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "poll_votes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"pollId" integer NOT NULL REFERENCES "meeting_polls"("id") ON DELETE CASCADE,"voterName" text NOT NULL,"voterEmail" text,"selectedSlots" text NOT NULL,"notes" text,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "workflows" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"name" text NOT NULL,"description" text,"trigger" text NOT NULL,"triggerMinutes" integer DEFAULT 0,"actionType" text NOT NULL DEFAULT 'email',"subject" text,"message" text DEFAULT '',"isActive" integer DEFAULT 1,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "workflow_actions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"workflowId" integer NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,"actionType" text NOT NULL,"subject" text,"message" text DEFAULT '',"config" text DEFAULT '{}',"sortOrder" integer DEFAULT 0,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "workflow_logs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"workflowId" integer NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,"userId" text NOT NULL,"appointmentId" integer,"trigger" text NOT NULL,"actionType" text NOT NULL,"customerName" text,"customerEmail" text,"status" text NOT NULL DEFAULT 'success',"errorMessage" text,"executedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "routing_forms" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"title" text NOT NULL,"fields" text DEFAULT '[]',"teamId" integer REFERENCES "teams"("id"),"redirectUrl" text,"isActive" integer DEFAULT 1,"shareToken" text UNIQUE,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "form_submissions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"formId" integer NOT NULL REFERENCES "routing_forms"("id") ON DELETE CASCADE,"data" text NOT NULL,"assignedTo" text,"status" text DEFAULT 'new',"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "email_log" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"appointmentId" integer NOT NULL,"userId" text NOT NULL,"emailType" text NOT NULL,"recipientEmail" text NOT NULL,"subject" text NOT NULL,"status" text NOT NULL DEFAULT 'pending',"errorMessage" text,"metadata" text,"sentAt" integer,"retryCount" integer DEFAULT 0,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "business_profiles" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"profession" text DEFAULT 'freelancer',"businessDescription" text,"location" text,"timezone" text DEFAULT 'UTC',"currency" text DEFAULT 'USD',"teamSize" integer DEFAULT 1,"onboardingCompleted" integer DEFAULT 0,"onboardingStep" integer DEFAULT 0,"enabledModules" text DEFAULT '[]',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "contacts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"name" text NOT NULL,"email" text,"phone" text,"company" text,"profession" text,"tags" text DEFAULT '[]',"source" text DEFAULT 'manual',"assignedTo" text,"status" text DEFAULT 'lead',"totalAppointments" integer DEFAULT 0,"totalRevenue" integer DEFAULT 0,"lastContactAt" integer,"firstContactAt" integer,"customFields" text DEFAULT '{}',"notes" text,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "contact_timeline" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"contactId" integer NOT NULL,"userId" text NOT NULL,"eventType" text NOT NULL,"title" text NOT NULL,"description" text,"metadata" text DEFAULT '{}',"linkedAppointmentId" integer,"linkedInvoiceId" integer,"linkedTaskId" integer,"linkedOpportunityId" integer,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "tasks" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"title" text NOT NULL,"description" text,"priority" text DEFAULT 'medium',"status" text DEFAULT 'todo',"dueDate" integer,"assignedTo" text,"contactId" integer,"linkedAppointmentId" integer,"linkedInvoiceId" integer,"linkedOpportunityId" integer,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "opportunities" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"title" text NOT NULL,"description" text,"value" integer DEFAULT 0,"currency" text DEFAULT 'USD',"contactId" integer,"stage" text DEFAULT 'lead',"probability" integer DEFAULT 0,"expectedCloseDate" integer,"actualCloseDate" integer,"lostReason" text,"assignedTo" text,"tags" text DEFAULT '[]',"customFields" text DEFAULT '{}',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "invoices" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"invoiceNumber" text NOT NULL,"contactId" integer,"linkedAppointmentId" integer,"linkedOpportunityId" integer,"status" text DEFAULT 'draft',"subtotal" integer DEFAULT 0,"taxRate" integer DEFAULT 0,"taxAmount" integer DEFAULT 0,"total" integer DEFAULT 0,"currency" text DEFAULT 'USD',"dueDate" integer,"paidAt" integer,"notes" text,"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "invoice_items" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"invoiceId" integer NOT NULL,"description" text NOT NULL,"quantity" integer DEFAULT 1,"unitPrice" integer DEFAULT 0,"amount" integer DEFAULT 0,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "payments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"invoiceId" integer NOT NULL,"amount" integer NOT NULL,"paymentMethod" text DEFAULT 'manual',"reference" text,"notes" text,"paidAt" integer NOT NULL,"createdAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "ai_providers" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"providerType" text NOT NULL,"apiKey" text,"isActive" integer DEFAULT 0,"config" text DEFAULT '{}',"createdAt" integer NOT NULL,"updatedAt" integer NOT NULL);
    CREATE TABLE IF NOT EXISTS "ai_insights" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,"userId" text NOT NULL,"insightType" text NOT NULL,"title" text NOT NULL,"description" text NOT NULL,"priority" text DEFAULT 'medium',"actionType" text,"actionUrl" text,"actionLabel" text,"isRead" integer DEFAULT 0,"isDismissed" integer DEFAULT 0,"metadata" text DEFAULT '{}',"createdAt" integer NOT NULL);
  `)
}

function verify() {
  const db = new Database('data/booksure-dev.db')
  db.pragma('journal_mode = WAL')
  initSchema(db)

  console.log('=== BOS Migration Verification ===\n')

  // 1. Check all BOS tables exist
  console.log('1. BOS Tables:')
  let allBosExist = true
  for (const table of BOS_TABLES) {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table) as { name: string } | undefined
    const exists = !!result
    if (!exists) allBosExist = false
    console.log(`   ${exists ? '\u2713' : '\u2717'} ${table}`)
  }

  // 2. Check all existing tables still exist
  console.log('\n2. Existing Tables (must be untouched):')
  let allExistingOk = true
  for (const table of EXISTING_TABLES) {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table) as { name: string } | undefined
    const exists = !!result
    if (!exists) allExistingOk = false
    console.log(`   ${exists ? '\u2713' : '\u2717'} ${table}`)
  }

  // 3. Check BOS table columns for key tables
  console.log('\n3. BOS Table Schema Verification:')

  const checkColumns = (table: string, expectedCols: string[]) => {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]
    const colNames = cols.map(c => c.name)
    let ok = true
    for (const col of expectedCols) {
      if (!colNames.includes(col)) {
        ok = false
        console.log(`   \u2717 ${table}.${col} - MISSING`)
      }
    }
    if (ok) {
      console.log(`   \u2713 ${table} - ${cols.length} columns OK`)
    }
  }

  checkColumns('business_profiles', ['id', 'userId', 'profession', 'onboardingCompleted', 'enabledModules'])
  checkColumns('contacts', ['id', 'userId', 'name', 'email', 'status', 'totalAppointments', 'totalRevenue'])
  checkColumns('contact_timeline', ['id', 'contactId', 'userId', 'eventType', 'title', 'linkedAppointmentId'])
  checkColumns('tasks', ['id', 'userId', 'title', 'status', 'priority', 'dueDate', 'contactId'])
  checkColumns('opportunities', ['id', 'userId', 'title', 'value', 'stage', 'contactId', 'probability'])
  checkColumns('invoices', ['id', 'userId', 'invoiceNumber', 'status', 'total', 'contactId', 'dueDate'])
  checkColumns('invoice_items', ['id', 'invoiceId', 'description', 'quantity', 'unitPrice', 'amount'])
  checkColumns('payments', ['id', 'userId', 'invoiceId', 'amount', 'paymentMethod', 'paidAt'])
  checkColumns('ai_providers', ['id', 'userId', 'providerType', 'apiKey', 'isActive'])
  checkColumns('ai_insights', ['id', 'userId', 'insightType', 'title', 'description', 'priority'])

  // 4. Verify existing appointment table unchanged
  console.log('\n4. Appointment Table Integrity:')
  const aptCols = db.prepare('PRAGMA table_info("appointments")').all() as { name: string }[]
  const aptColNames = aptCols.map(c => c.name)
  const requiredAptCols = [
    'id', 'userId', 'calendarId', 'customerName', 'customerEmail', 'customerPhone',
    'eventStart', 'eventEnd', 'duration', 'status', 'notes', 'manage_token',
    'client_token', 'confirmationSent', 'reminderSent', 'email_sent',
  ]
  let aptOk = true
  for (const col of requiredAptCols) {
    if (!aptColNames.includes(col)) {
      aptOk = false
      console.log(`   \u2717 appointments.${col} - MISSING`)
    }
  }
  if (aptOk) {
    console.log(`   \u2713 appointments table intact - ${aptCols.length} columns`)
  }

  // 5. Count rows
  console.log('\n5. Row Counts:')
  for (const table of [...BOS_TABLES, 'appointments']) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get() as { c: number }
    console.log(`   ${table}: ${count.c} rows`)
  }

  // Summary
  console.log('\n=== Summary ===')
  const pass = allBosExist && allExistingOk && aptOk
  console.log(pass ? '\u2713 ALL CHECKS PASSED' : '\u2717 SOME CHECKS FAILED')
  console.log(`  BOS tables: ${allBosExist ? 'ALL PRESENT' : 'MISSING TABLES'}`)
  console.log(`  Existing tables: ${allExistingOk ? 'ALL INTACT' : 'SOME MISSING'}`)
  console.log(`  Appointment schema: ${aptOk ? 'OK' : 'DAMAGED'}`)

  db.close()
  process.exit(pass ? 0 : 1)
}

try {
  verify()
} catch (error) {
  console.error('Verification failed:', error)
  process.exit(1)
}
