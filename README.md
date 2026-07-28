# BookSure - Appointment Booking System

BookSure is a modern, fully-featured appointment booking platform that helps small businesses and service providers manage customer bookings effortlessly. Built with Next.js 16, React 19, Neon PostgreSQL, and integrated with Google Calendar and SMS notifications.

## Features

### Core Features
- ✅ **Multi-step Booking Flow** - Intuitive date → time → details → confirmation flow
- ✅ **Public Booking Pages** - Custom URLs for each business (`/book/[businessSlug]`)
- ✅ **Real-time Availability** - Live slot availability based on working hours and existing appointments
- ✅ **Google Calendar Integration** - Sync with Google Calendar for calendar management
- ✅ **SMS Notifications** - Send booking confirmations and reminders (Twilio, MTN, Airtel)
- ✅ **Business Dashboard** - Manage appointments, settings, and share booking link
- ✅ **Payment System** - Stripe integration with 30-day free trial
- ✅ **Branding & Customization** - Custom colors, logos, and business names
- ✅ **Authentication** - Email/password signup and login via Better Auth

### SMS Providers
- **Twilio** - International SMS delivery
- **MTN** - Uganda and other African countries
- **Airtel** - Multiple African regions

## Tech Stack

- **Frontend**: Next.js 16, React 19.2, Tailwind CSS 4
- **Backend**: Node.js, Next.js API Routes
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth (email/password)
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Payments**: Stripe (via environment variables)

## Project Structure

```
├── app/
│   ├── page.tsx                    # Marketing homepage
│   ├── sign-in/page.tsx            # Login page
│   ├── sign-up/page.tsx            # Registration page
│   ├── dashboard/                  # Business owner dashboard
│   │   ├── page.tsx               # Main dashboard
│   │   └── branding/page.tsx      # Branding customization
│   ├── book/[businessSlug]/       # Public booking page
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth handler
│   │   └── book/                  # Public APIs
│   │       ├── slots/route.ts     # Get available slots
│   │       └── create/route.ts    # Create appointment
│   └── actions/
│       ├── users.ts               # User & business management
│       ├── appointments.ts        # Appointment operations
│       ├── calendar.ts            # Google Calendar integration
│       ├── sms.ts                 # SMS notifications
│       └── payments.ts            # Payment & subscription management
├── lib/
│   ├── auth.ts                    # Better Auth configuration
│   ├── auth-client.ts             # Client-side auth
│   └── db/
│       ├── index.ts              # Drizzle client
│       └── schema.ts             # Database schema
├── components/
│   ├── auth-form.tsx             # Shared auth form
│   └── ui/                       # shadcn/ui components
└── public/                       # Static assets
```

## Database Schema

### Better Auth Tables
- `user` - User accounts
- `session` - User sessions
- `account` - OAuth connections
- `verification` - Email verification

### BookSure Tables
- `google_calendars` - Google Calendar connections per user
- `appointments` - Customer appointments
- `manual_blocks` - Blocked time periods
- `payments` - Subscription and billing info
- `businesses` - Business profiles and branding

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Neon PostgreSQL database
- Environment variables configured

### Installation

1. **Clone and install dependencies**
   ```bash
   pnpm install
   ```

2. **Set environment variables**
   ```env
   DATABASE_URL=postgresql://...  # From Neon
   BETTER_AUTH_SECRET=...          # Generate with: openssl rand -base64 32
   BETTER_AUTH_URL=http://localhost:3000  # For development
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## API Endpoints

### Public APIs (No Authentication)

**Get Available Slots**
```
GET /api/book/slots
Query params:
  - businessSlug: string
  - date: ISO date string
  - duration: number (default: 30)

Response:
  { slots: ["2026-06-10T14:00:00Z", ...] }
```

**Create Appointment**
```
POST /api/book/create
Body: {
  businessSlug: string
  customerName: string
  customerEmail: string
  customerPhone: string
  eventStart: ISO date string
  duration: number
  notes?: string
}

Response:
  { success: true, appointment: {...} }
```

### Protected Server Actions

**User Actions** (`app/actions/users.ts`)
- `createBusiness()` - Create business profile
- `getBusiness()` - Get user's business
- `updateBusiness()` - Update business info
- `getOrCreatePaymentProfile()` - Get/create payment record
- `isTrialActive()` - Check if free trial is active

**Appointment Actions** (`app/actions/appointments.ts`)
- `getAvailableSlots()` - Get slots for a date
- `createAppointment()` - Create appointment
- `getAppointmentsByStatus()` - Get appointments
- `updateAppointmentStatus()` - Update status
- `cancelAppointment()` - Cancel appointment

**Calendar Actions** (`app/actions/calendar.ts`)
- `connectGoogleCalendar()` - Connect Google Calendar
- `getConnectedCalendar()` - Get calendar connection
- `updateCalendarSettings()` - Update working hours
- `disconnectCalendar()` - Disconnect calendar

**SMS Actions** (`app/actions/sms.ts`)
- `sendAppointmentConfirmation()` - Send confirmation SMS
- `sendAppointmentReminder()` - Send reminder SMS
- `sendAppointmentCancellation()` - Send cancellation SMS

**Payment Actions** (`app/actions/payments.ts`)
- `createStripeCustomer()` - Create Stripe customer
- `createStripeSubscription()` - Create subscription
- `cancelSubscription()` - Cancel subscription
- `isTrialActive()` - Check trial status
- `checkTrialAndAccess()` - Verify access

## Configuration

### Google Calendar OAuth
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars

### Stripe Integration
1. Get API keys from Stripe dashboard
2. Set `STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY` env vars
3. Set up webhook for subscription events

### SMS Integration

**Twilio Setup**
```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

**MTN Setup** (Uganda)
```env
MTN_API_KEY=...
MTN_API_SECRET=...
```

**Airtel Setup**
```env
AIRTEL_API_KEY=...
AIRTEL_API_SECRET=...
```

## Free Trial Features

All new users get a **30-day free trial** with full access to:
- Unlimited appointments
- Google Calendar sync
- SMS notifications (limited to 100/month)
- Custom branding
- Business dashboard

After trial expires, users must upgrade to a paid plan to continue using BookSure.

## Paid Plans (Future)

- **Pro** ($29/month) - Up to 1000 appointments/month
- **Business** ($99/month) - Unlimited appointments, priority support

## Deployment

### Deploy to Vercel
```bash
pnpm run build
# Commit and push to GitHub
# Connect repository to Vercel
# Set environment variables in Vercel dashboard
```

### Important Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth secret key
- `VERCEL_PROJECT_PRODUCTION_URL` - Production domain (auto-set by Vercel)

## Security Considerations

- All user data queries are scoped by `userId`
- Passwords hashed by Better Auth
- Sensitive tokens (Google, SMS) encrypted in database
- CSRF protection via Better Auth
- No sensitive data in client components

## Future Enhancements

- [ ] Multi-timezone support
- [ ] Recurring appointments
- [ ] Email notifications
- [ ] Payment processing (collect fees from customers)
- [ ] Team management (multiple staff members)
- [ ] Advanced analytics dashboard
- [ ] Integration with other calendars (Outlook, Apple Calendar)
- [ ] Video call integration (Zoom, Google Meet)
- [ ] Automated follow-up sequences
- [ ] Customer reviews and ratings

## Support

For issues and feature requests, open a GitHub issue or contact support@booksure.com

## License

MIT License - See LICENSE file for details

---

**Built with** Next.js, React, PostgreSQL, and deployed on Vercel.
