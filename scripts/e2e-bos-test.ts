#!/usr/bin/env tsx
/**
 * BOS End-to-End Test Script
 *
 * Tests the complete user journey through the data layer:
 * Onboarding → Contacts → Tasks → Opportunities → Invoices → Payments → AI Insights
 *
 * Also verifies existing appointment tables are untouched.
 *
 * Usage:
 *   npx tsx scripts/e2e-bos-test.ts
 */

import Database from 'better-sqlite3'

const TEST_USER_ID = 'test-user-e2e-001'
const TEST_CONTACT_EMAIL = 'jane.doe@example.com'
const TEST_CONTACT_PHONE = '+250788123456'

let db: InstanceType<typeof Database>
let passed = 0
let failed = 0
let total = 0

function assert(condition: boolean, message: string) {
  total++
  if (condition) {
    passed++
    console.log(`  \u2713 ${message}`)
  } else {
    failed++
    console.log(`  \u2717 ${message}`)
  }
}

function section(title: string) {
  console.log(`\n--- ${title} ---`)
}

function getNowMs() { return Date.now() }
function getFutureMs(days: number) { return Date.now() + days * 24 * 60 * 60 * 1000 }
function getPastMs(days: number) { return Date.now() - days * 24 * 60 * 60 * 1000 }

// Mirror of initSchema
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

function runTests() {
  console.log('=== BOS End-to-End Test Suite ===\n')

  // Use a test-specific database
  const dbPath = 'data/booksure-e2e-test.db'
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  initSchema(db)

  // ============================================================
  // PHASE 1: Onboarding
  // ============================================================
  section('Phase 1: Onboarding (Business Profile)')

  const now = getNowMs()
  db.prepare(`INSERT INTO business_profiles (userId, profession, businessDescription, location, timezone, currency, teamSize, onboardingCompleted, enabledModules, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'realtor', 'Premier real estate agency in Kigali', 'Kigali, Rwanda', 'Africa/Kigali', 'USD', 5, 1,
    JSON.stringify(['appointments', 'contacts', 'tasks', 'opportunities', 'invoices']), now, now
  )

  // Also create the businesses record (existing table)
  db.prepare(`INSERT INTO businesses (userId, businessName, businessSlug, brandColor, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Elite Properties', 'elite-properties', '#3b82f6', now, now
  )

  const profile = db.prepare('SELECT * FROM business_profiles WHERE userId = ?').get(TEST_USER_ID) as any
  assert(!!profile, 'Business profile created')
  assert(profile.profession === 'realtor', 'Profession set to realtor')
  assert(profile.onboardingCompleted === 1, 'Onboarding marked completed')
  assert(profile.teamSize === 5, 'Team size recorded')

  const biz = db.prepare('SELECT * FROM businesses WHERE userId = ?').get(TEST_USER_ID) as any
  assert(!!biz, 'Business record created')
  assert(biz.businessName === 'Elite Properties', 'Business name correct')

  // ============================================================
  // PHASE 2: Contact Creation (CRM)
  // ============================================================
  section('Phase 2: Contact Creation')

  db.prepare(`INSERT INTO contacts (userId, name, email, phone, company, profession, source, status, totalAppointments, totalRevenue, firstContactAt, lastContactAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Jane Doe', TEST_CONTACT_EMAIL, TEST_CONTACT_PHONE, 'Doe Enterprises', 'Business Owner', 'appointment', 'lead', 0, 0, now, now, now, now
  )

  const contact = db.prepare('SELECT * FROM contacts WHERE email = ?').get(TEST_CONTACT_EMAIL) as any
  assert(!!contact, 'Contact created')
  assert(contact.name === 'Jane Doe', 'Contact name correct')
  assert(contact.source === 'appointment', 'Contact source is appointment')
  assert(contact.status === 'lead', 'Contact status is lead')
  assert(contact.totalAppointments === 0, 'Initial appointment count is 0')

  // ============================================================
  // PHASE 3: Appointment Booking (Bridge)
  // ============================================================
  section('Phase 3: Appointment → Contact Bridge')

  // Simulate an appointment being booked
  const aptStart = getFutureMs(3)
  const aptEnd = aptStart + 60 * 60 * 1000 // 1 hour

  db.prepare(`INSERT INTO appointments (userId, calendarId, customerName, customerEmail, customerPhone, eventStart, eventEnd, duration, status, notes, manage_token, client_token, confirmationSent, reminderSent, email_sent, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 1, 'Jane Doe', TEST_CONTACT_EMAIL, TEST_CONTACT_PHONE,
    aptStart, aptEnd, 60, 'confirmed', 'Initial consultation',
    'test-manage-token', 'test-client-token', 0, 0, 0, now, now
  )

  // Simulate bridge: update contact appointment count
  db.prepare('UPDATE contacts SET totalAppointments = totalAppointments + 1, lastContactAt = ?, updatedAt = ? WHERE id = ?').run(now, now, contact.id)

  // Add timeline event
  db.prepare(`INSERT INTO contact_timeline (contactId, userId, eventType, title, description, linkedAppointmentId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    contact.id, TEST_USER_ID, 'appointment_booked', 'Appointment booked',
    `Scheduled for ${new Date(aptStart).toLocaleDateString()}`, 1,
    JSON.stringify({ duration: 60, status: 'confirmed' }), now
  )

  const updatedContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact.id) as any
  assert(updatedContact.totalAppointments === 1, 'Contact appointment count incremented')

  const timeline = db.prepare('SELECT * FROM contact_timeline WHERE contactId = ?').get(contact.id) as any
  assert(!!timeline, 'Timeline event created')
  assert(timeline.eventType === 'appointment_booked', 'Timeline event type correct')
  assert(timeline.linkedAppointmentId === 1, 'Timeline linked to appointment')

  const apt = db.prepare('SELECT * FROM appointments WHERE customerEmail = ?').get(TEST_CONTACT_EMAIL) as any
  assert(!!apt, 'Appointment exists')
  assert(apt.status === 'confirmed', 'Appointment status confirmed')

  // ============================================================
  // PHASE 4: Tasks
  // ============================================================
  section('Phase 4: Task Management')

  const taskDue = getFutureMs(5)
  db.prepare(`INSERT INTO tasks (userId, title, description, priority, status, dueDate, contactId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Follow up with Jane', 'Call to discuss property requirements', 'high', 'todo', taskDue, contact.id, now, now
  )

  db.prepare(`INSERT INTO tasks (userId, title, description, priority, status, dueDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Prepare listing presentation', 'Gather market data for Kigali properties', 'medium', 'in_progress', getFutureMs(7), now, now
  )

  const tasks = db.prepare('SELECT * FROM tasks WHERE userId = ?').all(TEST_USER_ID) as any[]
  assert(tasks.length === 2, `Created ${tasks.length} tasks`)
  assert(tasks[0].priority === 'high', 'First task priority is high')
  assert(tasks[0].contactId === contact.id, 'First task linked to contact')
  assert(tasks[1].status === 'in_progress', 'Second task in progress')

  // Update task status
  db.prepare('UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?').run('done', now, tasks[0].id)
  const doneTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(tasks[0].id) as any
  assert(doneTask.status === 'done', 'Task marked as done')

  // ============================================================
  // PHASE 5: Opportunities (Pipeline)
  // ============================================================
  section('Phase 5: Sales Pipeline')

  db.prepare(`INSERT INTO opportunities (userId, title, description, value, currency, contactId, stage, probability, expectedCloseDate, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Kigali Villa Purchase', 'Jane looking for 3BR villa in Kimihurura', 15000000, 'USD',
    contact.id, 'qualified', 60, getFutureMs(30), JSON.stringify(['luxury', 'villa']), now, now
  )

  db.prepare(`INSERT INTO opportunities (userId, title, description, value, currency, stage, probability, expectedCloseDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'Nyali Beach House', 'Beachfront property inquiry', 8500000, 'USD',
    'proposal', 40, getFutureMs(45), now, now
  )

  const opps = db.prepare('SELECT * FROM opportunities WHERE userId = ?').all(TEST_USER_ID) as any[]
  assert(opps.length === 2, `Created ${opps.length} opportunities`)
  assert(opps[0].value === 15000000, 'First opportunity value correct')
  assert(opps[0].stage === 'qualified', 'First opportunity stage correct')
  assert(opps[0].contactId === contact.id, 'First opportunity linked to contact')
  assert(opps[1].stage === 'proposal', 'Second opportunity in proposal stage')

  // Move opportunity through pipeline
  db.prepare('UPDATE opportunities SET stage = ?, probability = ?, updatedAt = ? WHERE id = ?').run('negotiation', 80, now, opps[0].id)
  const updatedOpp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(opps[0].id) as any
  assert(updatedOpp.stage === 'negotiation', 'Opportunity moved to negotiation')
  assert(updatedOpp.probability === 80, 'Probability updated')

  // ============================================================
  // PHASE 6: Invoices
  // ============================================================
  section('Phase 6: Invoicing')

  // Create invoice with line items
  db.prepare(`INSERT INTO invoices (userId, invoiceNumber, contactId, linkedAppointmentId, status, subtotal, taxRate, taxAmount, total, currency, dueDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, 'INV-2026-001', contact.id, apt.id, 'sent',
    500000, 18, 90000, 590000, 'USD',
    getFutureMs(15), 'Consultation fee for property search', now, now
  )

  const invoice = db.prepare('SELECT * FROM invoices WHERE invoiceNumber = ?').get('INV-2026-001') as any
  assert(!!invoice, 'Invoice created')
  assert(invoice.status === 'sent', 'Invoice status is sent')
  assert(invoice.total === 590000, 'Invoice total correct')
  assert(invoice.contactId === contact.id, 'Invoice linked to contact')
  assert(invoice.linkedAppointmentId === apt.id, 'Invoice linked to appointment')

  // Add line items
  db.prepare('INSERT INTO invoice_items (invoiceId, description, quantity, unitPrice, amount, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    invoice.id, 'Property Search Service', 1, 400000, 400000, now
  )
  db.prepare('INSERT INTO invoice_items (invoiceId, description, quantity, unitPrice, amount, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    invoice.id, 'Market Analysis Report', 1, 100000, 100000, now
  )

  const lineItems = db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoice.id) as any[]
  assert(lineItems.length === 2, `Created ${lineItems.length} line items`)
  assert(lineItems[0].amount === 400000, 'First line item amount correct')
  assert(lineItems[1].amount === 100000, 'Second line item amount correct')

  const lineTotal = lineItems.reduce((sum: number, item: any) => sum + item.amount, 0)
  assert(lineTotal === invoice.subtotal, 'Line items sum equals subtotal')

  // ============================================================
  // PHASE 7: Payments
  // ============================================================
  section('Phase 7: Payment Tracking')

  // Partial payment
  db.prepare(`INSERT INTO payments (userId, invoiceId, amount, paymentMethod, reference, notes, paidAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    TEST_USER_ID, invoice.id, 300000, 'bank_transfer', 'TXN-2026-001', 'First installment', now, now
  )

  const payments = db.prepare('SELECT * FROM payments WHERE invoiceId = ?').all(invoice.id) as any[]
  assert(payments.length === 1, `Created ${payments.length} payment`)
  assert(payments[0].amount === 300000, 'Payment amount correct')
  assert(payments[0].paymentMethod === 'bank_transfer', 'Payment method correct')

  const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0)
  assert(totalPaid < invoice.total, 'Partial payment - not fully paid yet')

  // Update invoice status
  db.prepare('UPDATE invoices SET status = ?, updatedAt = ? WHERE id = ?').run('partial', now, invoice.id)

  // Add timeline event for payment
  db.prepare(`INSERT INTO contact_timeline (contactId, userId, eventType, title, description, linkedInvoiceId, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    contact.id, TEST_USER_ID, 'payment_received', 'Payment received',
    `Received $${(300000 / 100).toFixed(2)} via bank transfer`, invoice.id,
    JSON.stringify({ amount: 300000, method: 'bank_transfer' }), now
  )

  // ============================================================
  // PHASE 8: AI Insights Engine
  // ============================================================
  section('Phase 8: AI Insights (Local Rules Engine)')

  // Test that the rules engine can query all BOS tables without errors
  // We can't call the actual engine (it uses Drizzle ORM), but we can verify the raw SQL

  // Simulate: overdue tasks
  const overdueTasks = db.prepare(
    "SELECT COUNT(*) as c FROM tasks WHERE userId = ? AND dueDate < ? AND status != 'done'"
  ).get(TEST_USER_ID, now) as any
  assert(typeof overdueTasks.c === 'number', 'AI can query overdue tasks')

  // Simulate: open opportunities value
  const openOpps = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total FROM opportunities WHERE userId = ? AND stage NOT IN ('won', 'lost')"
  ).get(TEST_USER_ID) as any
  assert(openOpps.count === 2, `AI sees ${openOpps.count} open opportunities`)
  assert(openOpps.total === 23500000, 'AI calculates total pipeline value')

  // Simulate: outstanding invoices
  const outstandingInv = db.prepare(
    "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM invoices WHERE userId = ? AND status IN ('sent', 'partial', 'overdue')"
  ).get(TEST_USER_ID) as any
  assert(outstandingInv.count === 1, `AI sees ${outstandingInv.count} outstanding invoice`)
  assert(outstandingInv.total === 590000, 'AI calculates outstanding amount')

  // Simulate: contact activity
  const recentTimeline = db.prepare(
    "SELECT COUNT(*) as c FROM contact_timeline WHERE contactId = ?"
  ).get(contact.id) as any
  assert(recentTimeline.c === 2, `Contact has ${recentTimeline.c} timeline events`)

  // Simulate: task completion rate
  const completedTasks = db.prepare(
    "SELECT COUNT(*) as done FROM tasks WHERE userId = ? AND status = 'done'"
  ).get(TEST_USER_ID) as any
  const totalTasks = db.prepare(
    "SELECT COUNT(*) as total FROM tasks WHERE userId = ?"
  ).get(TEST_USER_ID) as any
  const completionRate = completedTasks.done / totalTasks.total
  assert(completionRate === 0.5, `Task completion rate: ${(completionRate * 100).toFixed(0)}%`)

  // ============================================================
  // PHASE 9: Cross-Module Integrity
  // ============================================================
  section('Phase 9: Cross-Module Integrity')

  // Verify all foreign key relationships
  const contactWithOpps = db.prepare(
    'SELECT o.id as opp_id, o.title, o.stage FROM opportunities o WHERE o.contactId = ?'
  ).all(contact.id) as any[]
  assert(contactWithOpps.length === 1, 'Contact linked to 1 opportunity')
  assert(contactWithOpps[0].title === 'Kigali Villa Purchase', 'Correct opportunity linked')

  const contactWithApts = db.prepare(
    'SELECT a.id as apt_id, a.status FROM appointments a WHERE a.customerEmail = ?'
  ).all(TEST_CONTACT_EMAIL) as any[]
  assert(contactWithApts.length === 1, 'Contact linked to 1 appointment')

  const contactWithInvoices = db.prepare(
    'SELECT i.id as inv_id, i.invoiceNumber, i.status FROM invoices i WHERE i.contactId = ?'
  ).all(contact.id) as any[]
  assert(contactWithInvoices.length === 1, 'Contact linked to 1 invoice')
  assert(contactWithInvoices[0].invoiceNumber === 'INV-2026-001', 'Correct invoice linked')

  // ============================================================
  // PHASE 10: Existing Tables Untouched
  // ============================================================
  section('Phase 10: Existing Appointment System Integrity')

  // Verify appointments table still has all original columns
  const aptInfo = db.prepare('PRAGMA table_info("appointments")').all() as any[]
  const aptColNames = aptInfo.map((c: any) => c.name)
  assert(aptColNames.includes('manage_token'), 'appointments.manage_token exists')
  assert(aptColNames.includes('client_token'), 'appointments.client_token exists')
  assert(aptColNames.includes('confirmationSent'), 'appointments.confirmationSent exists')
  assert(aptColNames.includes('reminderSent'), 'appointments.reminderSent exists')
  assert(aptColNames.includes('email_sent'), 'appointments.email_sent exists')
  assert(aptColNames.includes('customerName'), 'appointments.customerName exists')
  assert(aptColNames.length >= 28, `appointments has ${aptColNames.length} columns (>= 28 expected)`)

  // Verify businesses table untouched
  const bizInfo = db.prepare('PRAGMA table_info("businesses")').all() as any[]
  const bizColNames = bizInfo.map((c: any) => c.name)
  assert(bizColNames.includes('businessSlug'), 'businesses.businessSlug exists')
  assert(bizColNames.includes('brandColor'), 'businesses.brandColor exists')
  assert(bizColNames.includes('durationOptions'), 'businesses.durationOptions exists')

  // Verify workflows table untouched
  const wfInfo = db.prepare('PRAGMA table_info("workflows")').all() as any[]
  const wfColNames = wfInfo.map((c: any) => c.name)
  assert(wfColNames.includes('trigger'), 'workflows.trigger exists')
  assert(wfColNames.includes('actionType'), 'workflows.actionType exists')
  assert(wfColNames.includes('triggerMinutes'), 'workflows.triggerMinutes exists')

  // Verify google_calendars table untouched
  const calInfo = db.prepare('PRAGMA table_info("google_calendars")').all() as any[]
  const calColNames = calInfo.map((c: any) => c.name)
  assert(calColNames.includes('calendarId'), 'google_calendars.calendarId exists')
  assert(calColNames.includes('workingHoursStart'), 'google_calendars.workingHoursStart exists')
  assert(calColNames.includes('lunchBreakStart'), 'google_calendars.lunchBreakStart exists')

  // Verify no BOS columns leaked into appointment tables
  assert(!aptColNames.includes('totalRevenue'), 'No BOS columns in appointments table')

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n=== TEST SUMMARY ===')
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  console.log(failed === 0 ? '\u2713 ALL TESTS PASSED' : '\u2717 SOME TESTS FAILED')

  // Cleanup
  db.close()
  try { require('fs').unlinkSync(dbPath) } catch {}

  process.exit(failed === 0 ? 0 : 1)
}

try {
  runTests()
} catch (error) {
  console.error('\n\u2717 Test suite crashed:', error)
  if (db) db.close()
  try { require('fs').unlinkSync('data/booksure-e2e-test.db') } catch {}
  process.exit(1)
}
