CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"insightType" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"actionType" text,
	"actionUrl" text,
	"actionLabel" text,
	"isRead" boolean DEFAULT false,
	"isDismissed" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"providerType" text NOT NULL,
	"apiKey" text,
	"isActive" boolean DEFAULT false,
	"config" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"calendarId" integer NOT NULL,
	"googleEventId" text,
	"customerName" text NOT NULL,
	"customerEmail" text NOT NULL,
	"customerPhone" text NOT NULL,
	"eventStart" timestamp NOT NULL,
	"eventEnd" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"status" text DEFAULT 'confirmed',
	"notes" text,
	"manage_token" text,
	"client_token" text,
	"notes_updated_at" timestamp,
	"rescheduled_from" timestamp,
	"confirmationSent" boolean DEFAULT false,
	"reminderSent" boolean DEFAULT false,
	"cancelledViaSms" boolean DEFAULT false,
	"email_sent" boolean DEFAULT false,
	"reminder_24h_email_sent" boolean DEFAULT false,
	"reminder_1h_email_sent" boolean DEFAULT false,
	"thank_you_email_sent" boolean DEFAULT false,
	"feedback_email_sent" boolean DEFAULT false,
	"cancelled_email_sent" boolean DEFAULT false,
	"rescheduled_email_sent" boolean DEFAULT false,
	"new_booking_notification_sent" boolean DEFAULT false,
	"unsubscribed" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_manage_token_unique" UNIQUE("manage_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"profession" text DEFAULT 'freelancer',
	"businessDescription" text,
	"location" text,
	"timezone" text DEFAULT 'UTC',
	"currency" text DEFAULT 'USD',
	"teamSize" integer DEFAULT 1,
	"onboardingCompleted" boolean DEFAULT false,
	"onboardingStep" integer DEFAULT 0,
	"enabledModules" jsonb DEFAULT '[]'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"businessName" text NOT NULL,
	"businessSlug" text,
	"logoUrl" text,
	"brandColor" text DEFAULT '#3b82f6',
	"smsProvider" text DEFAULT 'twilio',
	"requireEmail" boolean DEFAULT false,
	"smsSenderName" text,
	"maxAdvanceBooking" integer DEFAULT 30,
	"durationOptions" text DEFAULT '[15,30,45,60]',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_businessSlug_unique" UNIQUE("businessSlug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_timeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"contactId" integer NOT NULL,
	"userId" text NOT NULL,
	"eventType" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"linkedAppointmentId" integer,
	"linkedInvoiceId" integer,
	"linkedTaskId" integer,
	"linkedOpportunityId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"profession" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"source" text DEFAULT 'manual',
	"assignedTo" text,
	"status" text DEFAULT 'lead',
	"totalAppointments" integer DEFAULT 0,
	"totalRevenue" integer DEFAULT 0,
	"lastContactAt" timestamp,
	"firstContactAt" timestamp,
	"customFields" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointmentId" integer NOT NULL,
	"userId" text NOT NULL,
	"emailType" text NOT NULL,
	"recipientEmail" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"metadata" jsonb,
	"sentAt" timestamp,
	"retryCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"formId" integer NOT NULL,
	"data" jsonb NOT NULL,
	"assignedTo" text,
	"status" text DEFAULT 'new',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_calendars" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"calendarId" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"workingHoursStart" integer DEFAULT 9,
	"workingHoursEnd" integer DEFAULT 17,
	"bufferMinutes" integer DEFAULT 15,
	"lunchBreakStart" integer DEFAULT 12,
	"lunchBreakEnd" integer DEFAULT 13,
	"workingDays" jsonb DEFAULT '[1,2,3,4,5]'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendars_calendarId_unique" UNIQUE("calendarId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoiceId" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"unitPrice" integer DEFAULT 0,
	"amount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"dueDate" timestamp,
	"paidAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manual_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"calendarId" integer NOT NULL,
	"blockStart" timestamp NOT NULL,
	"blockEnd" timestamp NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration" integer DEFAULT 30,
	"proposedDates" jsonb NOT NULL,
	"timeStart" integer DEFAULT 9,
	"timeEnd" integer DEFAULT 17,
	"status" text DEFAULT 'open',
	"shareToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_polls_shareToken_unique" UNIQUE("shareToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"value" integer DEFAULT 0,
	"currency" text DEFAULT 'USD',
	"contactId" integer,
	"stage" text DEFAULT 'lead',
	"probability" integer DEFAULT 0,
	"expectedCloseDate" timestamp,
	"actualCloseDate" timestamp,
	"lostReason" text,
	"assignedTo" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"customFields" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"invoiceId" integer NOT NULL,
	"amount" integer NOT NULL,
	"paymentMethod" text DEFAULT 'manual',
	"reference" text,
	"notes" text,
	"paidAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pollId" integer NOT NULL,
	"voterName" text NOT NULL,
	"voterEmail" text,
	"selectedSlots" jsonb NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routing_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb,
	"teamId" integer,
	"redirectUrl" text,
	"isActive" boolean DEFAULT true,
	"shareToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "routing_forms_shareToken_unique" UNIQUE("shareToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'todo',
	"dueDate" timestamp,
	"assignedTo" text,
	"contactId" integer,
	"linkedAppointmentId" integer,
	"linkedInvoiceId" integer,
	"linkedOpportunityId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"teamId" integer NOT NULL,
	"memberName" text NOT NULL,
	"memberEmail" text NOT NULL,
	"memberPhone" text,
	"isActive" boolean DEFAULT true,
	"calendarId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"teamName" text NOT NULL,
	"teamColor" text DEFAULT '#3b82f6',
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflowId" integer NOT NULL,
	"actionType" text NOT NULL,
	"subject" text,
	"message" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"sortOrder" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workflowId" integer NOT NULL,
	"userId" text NOT NULL,
	"appointmentId" integer,
	"trigger" text NOT NULL,
	"actionType" text NOT NULL,
	"customerName" text,
	"customerEmail" text,
	"status" text DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"executedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"triggerMinutes" integer DEFAULT 0,
	"actionType" text DEFAULT 'email' NOT NULL,
	"subject" text,
	"message" text DEFAULT '' NOT NULL,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_routing_forms_id_fk" FOREIGN KEY ("formId") REFERENCES "public"."routing_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_pollId_meeting_polls_id_fk" FOREIGN KEY ("pollId") REFERENCES "public"."meeting_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_forms" ADD CONSTRAINT "routing_forms_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_logs" ADD CONSTRAINT "workflow_logs_workflowId_workflows_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_user_id" ON "contacts" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_email" ON "contacts" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_status" ON "contacts" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_timeline_contact_id" ON "contact_timeline" ("contactId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_timeline_user_id" ON "contact_timeline" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_user_id" ON "tasks" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks" ("dueDate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_opportunities_user_id" ON "opportunities" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_opportunities_stage" ON "opportunities" ("stage");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_user_id" ON "invoices" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_contact_id" ON "invoices" ("contactId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_invoice_id" ON "payments" ("invoiceId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_insights_user_id" ON "ai_insights" ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_profiles_user_id" ON "business_profiles" ("userId");

