import { pgTable, text, timestamp, boolean, serial, integer, jsonb, bigint } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').default('user'),
  suspended: boolean('suspended').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Add your app tables below. Always include a plain `userId` column so queries
// can be scoped per user — the security model depends on this column existing,
// not on a foreign key. Do NOT add a foreign key constraint
// (`.references(() => user.id, ...)`) unless the user explicitly asks for
// foreign keys or referential integrity; FK constraints make iterating on the
// schema harder.
//
// BookSure app tables

export const googleCalendars = pgTable('google_calendars', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  calendarId: text('calendarId').notNull().unique(),
  accessToken: text('accessToken').notNull(),
  refreshToken: text('refreshToken').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  timezone: text('timezone').default('UTC'),
  workingHoursStart: integer('workingHoursStart').default(9),
  workingHoursEnd: integer('workingHoursEnd').default(17),
  bufferMinutes: integer('bufferMinutes').default(15),
  lunchBreakStart: integer('lunchBreakStart').default(12),
  lunchBreakEnd: integer('lunchBreakEnd').default(13),
  workingDays: jsonb('workingDays').$type<number[]>().default([1, 2, 3, 4, 5]),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  calendarId: integer('calendarId').notNull(),
  googleEventId: text('googleEventId'),
  customerName: text('customerName').notNull(),
  customerEmail: text('customerEmail').notNull(),
  customerPhone: text('customerPhone').notNull(),
  eventStart: timestamp('eventStart').notNull(),
  eventEnd: timestamp('eventEnd').notNull(),
  duration: integer('duration').notNull(),
  status: text('status').default('confirmed'),
  notes: text('notes'),
  manageToken: text('manage_token').unique(),
  clientToken: text('client_token'),
  notesUpdatedAt: timestamp('notes_updated_at'),
  rescheduledFrom: timestamp('rescheduled_from'),
  confirmationSent: boolean('confirmationSent').default(false),
  reminderSent: boolean('reminderSent').default(false),
  cancelledViaSms: boolean('cancelledViaSms').default(false),
  emailSent: boolean('email_sent').default(false),
  reminder24hEmailSent: boolean('reminder_24h_email_sent').default(false),
  reminder1hEmailSent: boolean('reminder_1h_email_sent').default(false),
  thankYouEmailSent: boolean('thank_you_email_sent').default(false),
  feedbackEmailSent: boolean('feedback_email_sent').default(false),
  cancelledEmailSent: boolean('cancelled_email_sent').default(false),
  rescheduledEmailSent: boolean('rescheduled_email_sent').default(false),
  newBookingNotificationSent: boolean('new_booking_notification_sent').default(false),
  unsubscribed: boolean('unsubscribed').default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const manualBlocks = pgTable('manual_blocks', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  calendarId: integer('calendarId').notNull(),
  blockStart: timestamp('blockStart').notNull(),
  blockEnd: timestamp('blockEnd').notNull(),
  reason: text('reason'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  businessName: text('businessName').notNull(),
  businessSlug: text('businessSlug').unique(),
  logoUrl: text('logoUrl'),
  brandColor: text('brandColor').default('#3b82f6'),
  smsProvider: text('smsProvider').default('twilio'),
  requireEmail: boolean('requireEmail').default(false),
  smsSenderName: text('smsSenderName'),
  maxAdvanceBooking: integer('maxAdvanceBooking').default(30),
  durationOptions: text('durationOptions').default('[15,30,45,60]'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const emailVerificationCodes = pgTable('email_verification_codes', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- Team Scheduling ---
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  teamName: text('teamName').notNull(),
  teamColor: text('teamColor').default('#3b82f6'),
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('teamId').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  memberName: text('memberName').notNull(),
  memberEmail: text('memberEmail').notNull(),
  memberPhone: text('memberPhone'),
  isActive: boolean('isActive').default(true),
  calendarId: integer('calendarId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// --- Meeting Polls ---
export const meetingPolls = pgTable('meeting_polls', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration').default(30),
  proposedDates: jsonb('proposedDates').$type<string[]>().notNull(),
  timeStart: integer('timeStart').default(9),
  timeEnd: integer('timeEnd').default(17),
  status: text('status').default('open'),
  shareToken: text('shareToken').unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const pollVotes = pgTable('poll_votes', {
  id: serial('id').primaryKey(),
  pollId: integer('pollId').notNull().references(() => meetingPolls.id, { onDelete: 'cascade' }),
  voterName: text('voterName').notNull(),
  voterEmail: text('voterEmail'),
  selectedSlots: jsonb('selectedSlots').$type<string[]>().notNull(),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- Workflows / Automation ---
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger').notNull(),
  triggerMinutes: integer('triggerMinutes').default(0),
  actionType: text('actionType').notNull().default('email'),
  subject: text('subject'),
  message: text('message').notNull().default(''),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const workflowActions = pgTable('workflow_actions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflowId').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  actionType: text('actionType').notNull(),
  subject: text('subject'),
  message: text('message').notNull().default(''),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  sortOrder: integer('sortOrder').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const workflowLogs = pgTable('workflow_logs', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflowId').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  appointmentId: integer('appointmentId'),
  trigger: text('trigger').notNull(),
  actionType: text('actionType').notNull(),
  customerName: text('customerName'),
  customerEmail: text('customerEmail'),
  status: text('status').notNull().default('success'),
  errorMessage: text('errorMessage'),
  executedAt: timestamp('executedAt').notNull().defaultNow(),
})

// --- Routing Forms ---
export const routingForms = pgTable('routing_forms', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  fields: jsonb('fields').$type<{ label: string; type: string; required: boolean }[]>().default([]),
  teamId: integer('teamId').references(() => teams.id),
  redirectUrl: text('redirectUrl'),
  isActive: boolean('isActive').default(true),
  shareToken: text('shareToken').unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const formSubmissions = pgTable('form_submissions', {
  id: serial('id').primaryKey(),
  formId: integer('formId').notNull().references(() => routingForms.id, { onDelete: 'cascade' }),
  data: jsonb('data').$type<Record<string, string>>().notNull(),
  assignedTo: text('assignedTo'),
  status: text('status').default('new'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- Email Notification Log --------------------------------------------------
export const emailLog = pgTable('email_log', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointmentId').notNull(),
  userId: text('userId').notNull(),
  emailType: text('emailType').notNull(),
  recipientEmail: text('recipientEmail').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull().default('pending'),
  errorMessage: text('errorMessage'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  sentAt: timestamp('sentAt'),
  retryCount: integer('retryCount').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- AI Business Operating System Tables -------------------------------------

export const businessProfiles = pgTable('business_profiles', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  profession: text('profession').default('freelancer'),
  businessDescription: text('businessDescription'),
  location: text('location'),
  timezone: text('timezone').default('UTC'),
  currency: text('currency').default('USD'),
  teamSize: integer('teamSize').default(1),
  onboardingCompleted: boolean('onboardingCompleted').default(false),
  onboardingStep: integer('onboardingStep').default(0),
  enabledModules: jsonb('enabledModules').$type<string[]>().default([]),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  profession: text('profession'),
  tags: jsonb('tags').$type<string[]>().default([]),
  source: text('source').default('manual'),
  assignedTo: text('assignedTo'),
  status: text('status').default('lead'),
  totalAppointments: integer('totalAppointments').default(0),
  totalRevenue: integer('totalRevenue').default(0),
  lastContactAt: timestamp('lastContactAt'),
  firstContactAt: timestamp('firstContactAt'),
  customFields: jsonb('customFields').$type<Record<string, unknown>>().default({}),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const contactTimeline = pgTable('contact_timeline', {
  id: serial('id').primaryKey(),
  contactId: integer('contactId').notNull(),
  userId: text('userId').notNull(),
  eventType: text('eventType').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  linkedAppointmentId: integer('linkedAppointmentId'),
  linkedInvoiceId: integer('linkedInvoiceId'),
  linkedTaskId: integer('linkedTaskId'),
  linkedOpportunityId: integer('linkedOpportunityId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').default('medium'),
  status: text('status').default('todo'),
  dueDate: timestamp('dueDate'),
  assignedTo: text('assignedTo'),
  contactId: integer('contactId'),
  linkedAppointmentId: integer('linkedAppointmentId'),
  linkedInvoiceId: integer('linkedInvoiceId'),
  linkedOpportunityId: integer('linkedOpportunityId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  value: integer('value').default(0),
  currency: text('currency').default('USD'),
  contactId: integer('contactId'),
  stage: text('stage').default('lead'),
  probability: integer('probability').default(0),
  expectedCloseDate: timestamp('expectedCloseDate'),
  actualCloseDate: timestamp('actualCloseDate'),
  lostReason: text('lostReason'),
  assignedTo: text('assignedTo'),
  tags: jsonb('tags').$type<string[]>().default([]),
  customFields: jsonb('customFields').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
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
  dueDate: timestamp('dueDate'),
  paidAt: timestamp('paidAt'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoiceId').notNull(),
  description: text('description').notNull(),
  quantity: integer('quantity').default(1),
  unitPrice: integer('unitPrice').default(0),
  amount: integer('amount').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  invoiceId: integer('invoiceId').notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('paymentMethod').default('manual'),
  reference: text('reference'),
  notes: text('notes'),
  paidAt: timestamp('paidAt').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const aiProviders = pgTable('ai_providers', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  providerType: text('providerType').notNull(),
  apiKey: text('apiKey'),
  isActive: boolean('isActive').default(false),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const aiInsights = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  insightType: text('insightType').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').default('medium'),
  actionType: text('actionType'),
  actionUrl: text('actionUrl'),
  actionLabel: text('actionLabel'),
  isRead: boolean('isRead').default(false),
  isDismissed: boolean('isDismissed').default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- Platform Administration Tables -----------------------------------------
// These tables back the Platform Administration Center (/admin). They are kept
// separate from the business tables so admin capabilities never interfere with
// the business-owner flows.

export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  category: text('category').notNull().default('general'),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const professions = pgTable('professions', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isArchived: boolean('isArchived').notNull().default(false),
  isCustom: boolean('isCustom').notNull().default(false),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: text('actorUserId'),
  actorEmail: text('actorEmail'),
  action: text('action').notNull(),
  targetType: text('targetType'),
  targetId: text('targetId'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ipAddress: text('ipAddress'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const platformNotifications = pgTable('platform_notifications', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  severity: text('severity').notNull().default('info'),
  title: text('title').notNull(),
  message: text('message'),
  isRead: boolean('isRead').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const businessMeta = pgTable('business_meta', {
  id: serial('id').primaryKey(),
  businessId: integer('businessId').notNull().unique(),
  status: text('status').notNull().default('active'),
  plan: text('plan').notNull().default('free'),
  planStatus: text('planStatus').notNull().default('active'),
  planRenewsAt: timestamp('planRenewsAt'),
  storageBytes: bigint('storageBytes', { mode: 'number' }).notNull().default(0),
  aiUsageTokens: bigint('aiUsageTokens', { mode: 'number' }).notNull().default(0),
  lastActiveAt: timestamp('lastActiveAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
