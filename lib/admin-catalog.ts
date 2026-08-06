// ---------------------------------------------------------------------------
// Platform catalogs — metadata that drives the Platform Administration Center.
// ---------------------------------------------------------------------------

export interface ModuleDef {
  key: string
  label: string
  description: string
  icon: string
}

export const MODULES: ModuleDef[] = [
  { key: 'appointments', label: 'Appointment Booking', description: 'Calendar scheduling, booking links and reminders', icon: 'calendar' },
  { key: 'crm', label: 'CRM', description: 'Contacts, pipeline and deal tracking', icon: 'users' },
  { key: 'contacts', label: 'Contacts', description: 'Contact directory and timelines', icon: 'contact' },
  { key: 'opportunities', label: 'Opportunities', description: 'Sales pipeline and deal stages', icon: 'target' },
  { key: 'tasks', label: 'Tasks', description: 'To-do lists and follow-up tasks', icon: 'check' },
  { key: 'invoices', label: 'Invoices', description: 'Invoicing and billing', icon: 'file' },
  { key: 'payments', label: 'Payments', description: 'Payment processing and history', icon: 'card' },
  { key: 'reports', label: 'Reports', description: 'Business reporting and exports', icon: 'chart' },
  { key: 'analytics', label: 'Analytics', description: 'Business performance analytics', icon: 'trend' },
  { key: 'documents', label: 'Documents', description: 'Document management', icon: 'folder' },
  { key: 'marketing', label: 'Marketing', description: 'Campaigns and outreach', icon: 'megaphone' },
  { key: 'inventory', label: 'Inventory', description: 'Stock and product tracking', icon: 'box' },
  { key: 'hr', label: 'HR', description: 'Team and employee management', icon: 'briefcase' },
  { key: 'support', label: 'Customer Support', description: 'Support tickets and help desk', icon: 'help' },
]

export interface PlanDef {
  key: string
  label: string
  price: number
  features: string[]
}

export const PLANS: PlanDef[] = [
  { key: 'free', label: 'Free', price: 0, features: ['1 user', '50 appointments/mo', 'Email reminders'] },
  { key: 'pro', label: 'Pro', price: 29, features: ['5 users', 'Unlimited appointments', 'SMS + email reminders', 'AI insights'] },
  { key: 'business', label: 'Business', price: 99, features: ['20 users', 'Everything in Pro', 'Priority support', 'Advanced analytics'] },
  { key: 'enterprise', label: 'Enterprise', price: 499, features: ['Unlimited users', 'Custom integrations', 'Dedicated support', 'SLA'] },
]

export interface FlagDef {
  key: string
  label: string
  description: string
  category: string
  enabled: boolean
}

export const FLAG_DEFAULTS: FlagDef[] = [
  { key: 'ai-chat', label: 'AI Chat', description: 'Enable the AI assistant chat in business dashboards', category: 'AI', enabled: true },
  { key: 'ai-recommendations', label: 'AI Recommendations', description: 'Generate AI-powered business recommendations', category: 'AI', enabled: true },
  { key: 'ai-automation', label: 'AI Automation', description: 'Automatic AI workflows for follow-ups', category: 'AI', enabled: false },
  { key: 'invoicing', label: 'Invoicing', description: 'Enable invoicing module', category: 'Billing', enabled: true },
  { key: 'online-payments', label: 'Online Payments', description: 'Accept payments through connected gateways', category: 'Billing', enabled: false },
  { key: 'inventory', label: 'Inventory', description: 'Enable inventory tracking', category: 'Modules', enabled: false },
  { key: 'marketing', label: 'Marketing', description: 'Enable marketing campaigns', category: 'Modules', enabled: false },
  { key: 'hr', label: 'HR', description: 'Enable HR management', category: 'Modules', enabled: false },
  { key: 'support-center', label: 'Support Center', description: 'Enable customer support module', category: 'Modules', enabled: false },
  { key: 'teams', label: 'Teams', description: 'Enable team scheduling', category: 'Scheduling', enabled: true },
  { key: 'routing-forms', label: 'Routing Forms', description: 'Enable routing forms', category: 'Scheduling', enabled: true },
  { key: 'meeting-polls', label: 'Meeting Polls', description: 'Enable meeting poll scheduling', category: 'Scheduling', enabled: true },
  { key: 'workflows', label: 'Workflows', description: 'Enable automation workflows', category: 'Automation', enabled: true },
  { key: 'public-beta', label: 'Public Beta', description: 'Public access to new features', category: 'Release', enabled: false },
]

export interface IntegrationDef {
  key: string
  label: string
  description: string
  kind: 'calendar' | 'email' | 'sms' | 'payments' | 'ai' | 'webhook'
  configured: boolean
}

export function integrationStatus(settings: Record<string, unknown>): IntegrationDef[] {
  const s = settings
  return [
    { key: 'google-calendar', label: 'Google Calendar', description: 'Two-way calendar sync for booking availability', kind: 'calendar', configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) },
    { key: 'outlook-calendar', label: 'Outlook Calendar', description: 'Microsoft 365 calendar integration', kind: 'calendar', configured: false },
    { key: 'smtp', label: 'SMTP / Email', description: 'Transactional and reminder email delivery', kind: 'email', configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER) },
    { key: 'twilio', label: 'Twilio SMS', description: 'SMS confirmations and reminders', kind: 'sms', configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid_here') },
    { key: 'stripe', label: 'Stripe', description: 'Card payment processing', kind: 'payments', configured: false },
    { key: 'paypal', label: 'PayPal', description: 'PayPal checkout', kind: 'payments', configured: false },
    { key: 'flutterwave', label: 'Flutterwave', description: 'African payment gateway', kind: 'payments', configured: false },
    { key: 'paystack', label: 'Paystack', description: 'West African payment gateway', kind: 'payments', configured: false },
    { key: 'openai', label: 'OpenAI', description: 'GPT-powered AI features', kind: 'ai', configured: false },
    { key: 'claude', label: 'Claude (Anthropic)', description: 'Claude-powered AI features', kind: 'ai', configured: false },
    { key: 'gemini', label: 'Gemini', description: 'Google Gemini AI features', kind: 'ai', configured: false },
    { key: 'webhooks', label: 'Webhooks', description: 'Outgoing event webhooks', kind: 'webhook', configured: false },
  ]
}

export interface ProfessionConfig {
  terminology: { singular: string; plural: string; bookingNoun: string; clientNoun: string }
  widgets: string[]
  navigation: string[]
  defaultModules: string[]
  kpis: string[]
  workflows: { trigger: string; name: string }[]
  templates: string[]
  aiBehavior: { tone: string; focus: string[] }
  defaultReports: string[]
  quickActions: string[]
}

export function defaultProfessionConfig(): ProfessionConfig {
  return {
    terminology: { singular: 'professional', plural: 'professionals', bookingNoun: 'appointment', clientNoun: 'client' },
    widgets: ['upcoming', 'stats', 'recent-activity'],
    navigation: ['dashboard', 'appointments', 'contacts', 'settings'],
    defaultModules: ['appointments', 'contacts', 'tasks'],
    kpis: ['total_appointments', 'no_show_rate', 'revenue'],
    workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }],
    templates: ['booking-confirmation', 'reminder', 'thank-you'],
    aiBehavior: { tone: 'professional', focus: ['reminders', 'follow-ups', 'insights'] },
    defaultReports: ['appointments', 'no-shows'],
    quickActions: ['new-appointment', 'new-contact'],
  }
}

export const SEED_PROFESSIONS: { slug: string; name: string; description: string; config: ProfessionConfig }[] = [
  {
    slug: 'freelancer',
    name: 'Freelancer / Service Provider',
    description: 'General-purpose freelancing and consulting',
    config: {
      terminology: { singular: 'professional', plural: 'professionals', bookingNoun: 'appointment', clientNoun: 'client' },
      widgets: ['upcoming', 'stats', 'recent-activity', 'ai-insights'],
      navigation: ['dashboard', 'appointments', 'contacts', 'tasks', 'invoices', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks', 'invoices'],
      kpis: ['total_appointments', 'no_show_rate', 'revenue', 'response_time'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }, { trigger: 'reminder', name: '24h reminder' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you'],
      aiBehavior: { tone: 'professional', focus: ['reminders', 'follow-ups', 'insights'] },
      defaultReports: ['appointments', 'no-shows', 'revenue'],
      quickActions: ['new-appointment', 'new-contact', 'new-invoice'],
    },
  },
  {
    slug: 'doctor',
    name: 'Doctor / Medical Practice',
    description: 'Medical practices and clinics',
    config: {
      terminology: { singular: 'doctor', plural: 'doctors', bookingNoun: 'visit', clientNoun: 'patient' },
      widgets: ['upcoming', 'stats', 'recent-activity', 'ai-insights', 'patient-acuity'],
      navigation: ['dashboard', 'appointments', 'patients', 'tasks', 'invoices', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks', 'invoices'],
      kpis: ['total_appointments', 'no_show_rate', 'revenue', 'avg_visit_length', 'recall_rate'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }, { trigger: 'reminder', name: '24h reminder' }, { trigger: 'reminder', name: '1h reminder' }, { trigger: 'follow_up', name: 'Post-visit follow-up' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you', 'post-visit'],
      aiBehavior: { tone: 'empathetic', focus: ['reminders', 'recalls', 'no-show-reduction', 'follow-ups'] },
      defaultReports: ['appointments', 'no-shows', 'recalls', 'revenue'],
      quickActions: ['new-appointment', 'new-patient', 'send-recall'],
    },
  },
  {
    slug: 'attorney',
    name: 'Attorney / Law Firm',
    description: 'Law firms and legal practices',
    config: {
      terminology: { singular: 'attorney', plural: 'attorneys', bookingNoun: 'consultation', clientNoun: 'client' },
      widgets: ['upcoming', 'stats', 'recent-activity', 'case-overview'],
      navigation: ['dashboard', 'appointments', 'contacts', 'tasks', 'invoices', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks', 'invoices'],
      kpis: ['total_consultations', 'no_show_rate', 'billable_hours', 'revenue'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send consultation confirmation' }, { trigger: 'reminder', name: 'Reminder' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you'],
      aiBehavior: { tone: 'formal', focus: ['reminders', 'intake', 'follow-ups'] },
      defaultReports: ['consultations', 'no-shows', 'billable-hours'],
      quickActions: ['new-consultation', 'new-client', 'new-task'],
    },
  },
  {
    slug: 'dentist',
    name: 'Dentist / Dental Practice',
    description: 'Dental practices and clinics',
    config: {
      terminology: { singular: 'dentist', plural: 'dentists', bookingNoun: 'visit', clientNoun: 'patient' },
      widgets: ['upcoming', 'stats', 'recent-activity', 'hygiene-tracker'],
      navigation: ['dashboard', 'appointments', 'patients', 'tasks', 'invoices', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks', 'invoices'],
      kpis: ['total_appointments', 'no_show_rate', 'revenue', 'hygiene_recalls'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }, { trigger: 'reminder', name: 'Reminder' }, { trigger: 'follow_up', name: 'Hygiene recall' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you', 'recall'],
      aiBehavior: { tone: 'friendly', focus: ['reminders', 'recalls', 'no-show-reduction'] },
      defaultReports: ['appointments', 'no-shows', 'recalls'],
      quickActions: ['new-appointment', 'new-patient', 'schedule-recall'],
    },
  },
  {
    slug: 'salon',
    name: 'Salon / Barber Shop',
    description: 'Hair, beauty and grooming businesses',
    config: {
      terminology: { singular: 'stylist', plural: 'stylists', bookingNoun: 'booking', clientNoun: 'client' },
      widgets: ['upcoming', 'stats', 'recent-activity'],
      navigation: ['dashboard', 'appointments', 'contacts', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks'],
      kpis: ['total_bookings', 'no_show_rate', 'revenue', 'rebooking_rate'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }, { trigger: 'reminder', name: 'Reminder' }, { trigger: 'follow_up', name: 'Re-booking ask' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you'],
      aiBehavior: { tone: 'casual', focus: ['reminders', 'rebooking', 'no-show-reduction'] },
      defaultReports: ['bookings', 'no-shows', 'revenue'],
      quickActions: ['new-booking', 'new-client'],
    },
  },
  {
    slug: 'coach',
    name: 'Coach / Consultant',
    description: 'Life, business and fitness coaching',
    config: {
      terminology: { singular: 'coach', plural: 'coaches', bookingNoun: 'session', clientNoun: 'client' },
      widgets: ['upcoming', 'stats', 'recent-activity', 'ai-insights'],
      navigation: ['dashboard', 'appointments', 'contacts', 'tasks', 'invoices', 'settings'],
      defaultModules: ['appointments', 'contacts', 'tasks', 'invoices'],
      kpis: ['total_sessions', 'no_show_rate', 'revenue', 'retention'],
      workflows: [{ trigger: 'booking_confirmed', name: 'Send confirmation' }, { trigger: 'reminder', name: 'Reminder' }, { trigger: 'follow_up', name: 'Session follow-up' }],
      templates: ['booking-confirmation', 'reminder', 'thank-you'],
      aiBehavior: { tone: 'motivating', focus: ['reminders', 'follow-ups', 'accountability'] },
      defaultReports: ['sessions', 'no-shows', 'revenue'],
      quickActions: ['new-session', 'new-client', 'new-task'],
    },
  },
]

export interface SettingDef {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select'
  help?: string
  default: string | number | boolean
  options?: { value: string; label: string }[]
}

export const SETTINGS_SCHEMA: { group: string; items: SettingDef[] }[] = [
  {
    group: 'Platform',
    items: [
      { key: 'platformName', label: 'Platform name', type: 'text', default: 'BookSure', help: 'Shown in the admin UI and emails' },
      { key: 'supportEmail', label: 'Support email', type: 'text', default: process.env.SMTP_FROM || 'support@booksure.app' },
      { key: 'supportPhone', label: 'Support phone', type: 'text', default: '' },
    ],
  },
  {
    group: 'Appointments',
    items: [
      { key: 'maxAdvanceBookingDays', label: 'Default max advance booking (days)', type: 'number', default: 30 },
      { key: 'bookingRequiresEmail', label: 'Require email for bookings', type: 'boolean', default: true },
    ],
  },
  {
    group: 'Reminders',
    items: [
      { key: 'reminderDefaults', label: 'Default reminder windows (minutes before)', type: 'text', default: '1440,60', help: 'Comma-separated minutes before the appointment' },
      { key: 'autoRescheduleEnabled', label: 'Auto-reschedule window', type: 'boolean', default: false },
    ],
  },
  {
    group: 'Billing',
    items: [
      { key: 'currency', label: 'Default currency', type: 'select', default: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'RWF', label: 'RWF' }, { value: 'KES', label: 'KES' }, { value: 'NGN', label: 'NGN' }] },
      { key: 'trialDays', label: 'Trial days for paid plans', type: 'number', default: 14 },
    ],
  },
  {
    group: 'AI',
    items: [
      { key: 'aiEngine', label: 'AI engine', type: 'select', default: 'rules', options: [{ value: 'rules', label: 'Local rules engine (no API key needed)' }, { value: 'openai', label: 'OpenAI' }, { value: 'claude', label: 'Claude' }, { value: 'gemini', label: 'Gemini' }] },
      { key: 'aiReplyTone', label: 'Default AI reply tone', type: 'select', default: 'professional', options: [{ value: 'professional', label: 'Professional' }, { value: 'friendly', label: 'Friendly' }, { value: 'formal', label: 'Formal' }, { value: 'casual', label: 'Casual' }] },
    ],
  },
  {
    group: 'Developer',
    items: [
      { key: 'apiRateLimit', label: 'API rate limit (requests / hour)', type: 'number', default: 100 },
      { key: 'publicApiEnabled', label: 'Public API access', type: 'boolean', default: false },
    ],
  },
]

export const NAV_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'layout' },
  { key: 'businesses', label: 'Businesses', href: '/admin/businesses', icon: 'building' },
  { key: 'users', label: 'Users', href: '/admin/users', icon: 'users' },
  { key: 'professions', label: 'Profession Studio', href: '/admin/professions', icon: 'sparkles' },
  { key: 'ai', label: 'AI Management', href: '/admin/ai', icon: 'brain' },
  { key: 'appointments', label: 'Appointments', href: '/admin/appointments', icon: 'calendar' },
  { key: 'crm', label: 'CRM', href: '/admin/crm', icon: 'contact' },
  { key: 'finance', label: 'Finance', href: '/admin/finance', icon: 'dollar' },
  { key: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: 'trend' },
  { key: 'integrations', label: 'Integrations', href: '/admin/integrations', icon: 'plug' },
  { key: 'modules', label: 'Modules', href: '/admin/modules', icon: 'grid' },
  { key: 'feature-flags', label: 'Feature Flags', href: '/admin/feature-flags', icon: 'flag' },
  { key: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: 'bell' },
  { key: 'reports', label: 'Reports', href: '/admin/reports', icon: 'file' },
  { key: 'audit-logs', label: 'Audit Logs', href: '/admin/audit-logs', icon: 'list' },
  { key: 'security', label: 'Security', href: '/admin/security', icon: 'shield' },
  { key: 'developer', label: 'Developer Tools', href: '/admin/developer', icon: 'code' },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: 'gear' },
]
