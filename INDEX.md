# BookSure - Documentation Index

Welcome to BookSure! This file helps you navigate all the documentation.

## 📖 Start Here

### For Quick Setup (5 minutes)
→ Read **[QUICKSTART.md](./QUICKSTART.md)**
- Local installation
- Environment setup
- Running the dev server
- Testing the app locally

### For Complete Understanding (15 minutes)
→ Read **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)**
- What has been built
- Technical architecture
- Project structure
- Feature overview

### For Full Documentation (30 minutes)
→ Read **[README.md](./README.md)**
- Complete feature list
- Tech stack overview
- Database schema
- API endpoints overview
- Configuration guide

## 🚀 Ready to Deploy?

→ Read **[DEPLOYMENT.md](./DEPLOYMENT.md)**
- Pre-deployment checklist
- Vercel deployment steps
- Environment variables
- Integration setup
- Monitoring & maintenance

## 📡 Building Integrations?

→ Read **[API.md](./API.md)**
- Complete API reference
- All endpoints documented
- Request/response examples
- Error handling
- Rate limiting

## 📁 File Map

### Documentation Files (In Root)
```
📄 README.md                  # Complete documentation
📄 QUICKSTART.md              # 5-minute setup guide
📄 DEPLOYMENT.md              # Production deployment
📄 API.md                     # API reference
📄 PROJECT_SUMMARY.md         # Project status & architecture
📄 INDEX.md                   # This file
```

### Source Code Structure
```
app/
├── (auth)/                   # Authentication pages
│   ├── sign-in/page.tsx     # Login
│   └── sign-up/page.tsx     # Registration
├── actions/                  # Server-side logic
│   ├── appointments.ts
│   ├── branding.ts
│   ├── business.ts
│   ├── calendar.ts
│   └── ... more actions
├── api/                      # API routes
│   ├── auth/
│   └── ... more routes
├── dashboard/page.tsx        # Main dashboard
├── appointments/page.tsx     # Appointment list
├── settings/page.tsx         # Settings page
├── book/[slug]/page.tsx      # Public booking page
└── layout.tsx               # Root layout

components/
├── auth-form.tsx            # Login/signup form
├── booking-form.tsx         # Booking form
├── branding-customizer.tsx  # Branding UI
├── settings-form.tsx        # Settings form
└── ui/                      # shadcn/ui components

lib/
├── auth.ts                  # Better Auth config
├── db/
│   ├── index.ts            # Drizzle setup
│   └── schema.ts           # Database schema
└── utils.ts                # Utilities
```

## 🎯 By Use Case

### I want to understand the project
1. Start: **PROJECT_SUMMARY.md**
2. Details: **README.md**
3. Code: `/app` and `/lib` directories

### I want to run it locally
1. Follow: **QUICKSTART.md**
2. Troubleshoot: **README.md** → Troubleshooting section
3. Reference: **API.md** for testing endpoints

### I want to deploy to production
1. Checklist: **DEPLOYMENT.md**
2. Reference: **QUICKSTART.md** → Integration Setup section
3. Configure: Environment variables for your integrations

### I want to build an integration
1. Understand: **API.md** → Complete API reference
2. Example: **README.md** → API Endpoints
3. Code: `/app/actions/*` for patterns

### I want to customize the UI
1. Components: `/components` folder
2. Styling: Tailwind CSS classes (see `globals.css`)
3. Colors: Brand color in settings
4. Pages: `/app` folder for routes

### I want to add a new feature
1. Database: Check `/lib/db/schema.ts`
2. Actions: Add to `/app/actions/*`
3. Components: Create in `/components`
4. Pages: Create in `/app`

## 🔍 Find Information By Topic

### Authentication
- **Setup**: README.md → Authentication section
- **Code**: `/lib/auth.ts`, `/app/(auth)/`
- **API**: API.md → Authentication endpoints

### Google Calendar
- **Setup**: QUICKSTART.md → Integration Setup → Google Calendar OAuth
- **Code**: `/app/actions/google-calendar.ts`
- **API**: API.md → Calendar Management
- **Configuration**: README.md → Google Calendar Integration

### Appointments & Booking
- **Setup**: QUICKSTART.md → Testing the Full Flow
- **Code**: `/app/actions/appointments.ts`, `/app/book/[slug]/page.tsx`
- **API**: API.md → Appointments section
- **Database**: README.md → Database Schema

### Payments & Billing
- **Setup**: QUICKSTART.md → Integration Setup → Stripe
- **Code**: `/app/actions/payments.ts`
- **Configuration**: DEPLOYMENT.md → Optional Integrations → Stripe

### SMS Notifications
- **Setup**: QUICKSTART.md → Integration Setup → Twilio SMS
- **Code**: `/app/actions/sms.ts`
- **Configuration**: DEPLOYMENT.md → Optional Integrations → Twilio

### Database Schema
- **See**: `/lib/db/schema.ts`
- **Details**: README.md → Database Schema
- **Relationships**: PROJECT_SUMMARY.md → Database Relationships

### Environment Variables
- **List**: .env.local template
- **Details**: README.md → Environment Variables
- **Production**: DEPLOYMENT.md → Phase 1 → Environment Variables

## ⚡ Quick Links

### Development
- Run locally: `pnpm dev`
- Type check: `pnpm tsc --noEmit`
- Database: `pnpm db:push`
- Database GUI: `pnpm db:studio`

### Common Tasks
- Sign up: http://localhost:3000/sign-up
- Connect calendar: http://localhost:3000/connect-calendar
- View appointments: http://localhost:3000/appointments
- Settings: http://localhost:3000/settings
- Test booking: http://localhost:3000/book/[your-slug]

### Configuration
- Google OAuth: [Google Cloud Console](https://console.cloud.google.com)
- Stripe: [Stripe Dashboard](https://dashboard.stripe.com)
- Twilio: [Twilio Console](https://console.twilio.com)
- Neon Database: [Neon Dashboard](https://neon.tech)

## 📱 Learn by Example

### Example: Connect Google Calendar
```typescript
// See /app/actions/google-calendar.ts
import { connectGoogleCalendar } from '@/app/actions/google-calendar'

// Call in your component
const calendarId = await connectGoogleCalendar(
  'user@gmail.com',
  'access_token',
  'refresh_token',
  expiresAt,
  'America/New_York'
)
```

### Example: Get Available Slots
```typescript
// See /app/actions/appointments.ts
import { getAvailableSlots } from '@/app/actions/appointments'

// Call in your component
const slots = await getAvailableSlots('john-doe', new Date('2026-06-15'))
```

### Example: Create Appointment
```typescript
// See /app/actions/appointments.ts
import { createAppointment } from '@/app/actions/appointments'

// Call in your form
const appointment = await createAppointment({
  businessSlug: 'john-doe',
  customerName: 'Jane Smith',
  customerEmail: 'jane@example.com',
  customerPhone: '+1-555-0100',
  eventStart: new Date('2026-06-15T10:00:00Z'),
  duration: 30
})
```

## 🐛 Troubleshooting

### Build or Runtime Errors
1. Check console: `pnpm dev` output
2. Debug: `pnpm tsc --noEmit`
3. Reference: README.md → Troubleshooting
4. Database: `pnpm db:push` to sync schema

### Authentication Issues
1. Check env vars: `.env.local`
2. Read: README.md → Authentication section
3. Debug: Check `/lib/auth.ts` configuration

### Google Calendar Not Working
1. Verify OAuth credentials in `.env.local`
2. Check redirect URI matches exactly
3. Read: QUICKSTART.md → Google Calendar OAuth setup

### Database Connection Failed
1. Verify DATABASE_URL in `.env.local`
2. Check Neon dashboard
3. Run: `pnpm db:push`

## 📚 External Resources

- **Next.js 16**: https://nextjs.org/docs
- **React 19**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Better Auth**: https://betterauth.dev
- **Drizzle ORM**: https://orm.drizzle.team
- **PostgreSQL**: https://www.postgresql.org/docs
- **Vercel Docs**: https://vercel.com/docs

## ✅ Checklist for Getting Started

- [ ] Read PROJECT_SUMMARY.md (understand what's built)
- [ ] Follow QUICKSTART.md (set up locally)
- [ ] Test signing up and logging in
- [ ] Connect your Google Calendar
- [ ] Create a test appointment
- [ ] Check appointments page
- [ ] Read DEPLOYMENT.md when ready to deploy
- [ ] Deploy to Vercel (takes ~10 minutes)

## 🎯 What to Read When

| Time Available | What to Read |
|---|---|
| 2 minutes | PROJECT_SUMMARY.md → What Has Been Built |
| 5 minutes | QUICKSTART.md |
| 15 minutes | PROJECT_SUMMARY.md (full) |
| 30 minutes | README.md + PROJECT_SUMMARY.md |
| 1 hour | README.md + DEPLOYMENT.md + API.md |
| 2+ hours | All documentation + code review |

## 🎓 Learning Path

1. **Understand** → PROJECT_SUMMARY.md
2. **Setup** → QUICKSTART.md
3. **Explore** → Run `pnpm dev` and test UI
4. **Learn** → README.md (features and architecture)
5. **Build** → Read code in `/app` and `/lib`
6. **Deploy** → DEPLOYMENT.md
7. **Integrate** → API.md + integrate external services

---

**That's it! You now have a complete understanding of BookSure.**

Start with QUICKSTART.md if you want to run it, or PROJECT_SUMMARY.md if you want to understand it.

Happy coding! 🚀
