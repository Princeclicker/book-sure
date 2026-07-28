# BookSure - API Documentation

Complete API reference for BookSure - the appointment booking SaaS platform.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

## Authentication

BookSure uses **Better Auth** with email/password and optional Google OAuth.

### Sign Up
```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "token": "session_token_123"
  }
}
```

### Sign In
```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Sign Out
```http
POST /api/auth/sign-out
```

### Get Session
```http
GET /api/auth/session
```

Returns current user session if authenticated, 401 if not.

---

## Public Endpoints

These endpoints don't require authentication.

### Get Available Slots

Get available time slots for a business on a specific date.

```http
GET /api/book/slots?businessSlug=john-doe&date=2026-06-15&duration=30
```

**Query Parameters**:
- `businessSlug` (required): The business slug from their booking page URL
- `date` (required): ISO date string (YYYY-MM-DD)
- `duration` (optional): Duration in minutes, default 30

**Response** (200):
```json
{
  "slots": [
    "2026-06-15T09:00:00Z",
    "2026-06-15T09:30:00Z",
    "2026-06-15T10:00:00Z",
    "2026-06-15T10:30:00Z"
  ]
}
```

**Errors**:
- 404: Business not found
- 400: Missing required parameters

### Create Appointment

Book a new appointment.

```http
POST /api/book/create
Content-Type: application/json

{
  "businessSlug": "john-doe",
  "customerName": "Jane Smith",
  "customerEmail": "jane@example.com",
  "customerPhone": "+1-555-0100",
  "eventStart": "2026-06-15T10:00:00Z",
  "duration": 30,
  "notes": "Please arrive 5 minutes early"
}
```

**Response** (201):
```json
{
  "success": true,
  "appointment": {
    "id": 1,
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "customerPhone": "+1-555-0100",
    "eventStart": "2026-06-15T10:00:00Z",
    "eventEnd": "2026-06-15T10:30:00Z",
    "status": "confirmed",
    "createdAt": "2026-06-11T10:00:00Z"
  }
}
```

**Errors**:
- 400: Invalid input
- 404: Business not found
- 409: Time slot unavailable

---

## Protected Endpoints

These require authentication (session cookie).

### User Profile

Get current user details.

```http
GET /api/user
```

**Response** (200):
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "emailVerified": true
}
```

### Business Management

#### Get Business

```http
GET /api/business
```

**Response** (200):
```json
{
  "id": 1,
  "userId": "user_123",
  "businessName": "John's Consulting",
  "businessSlug": "john-doe",
  "logoUrl": null,
  "brandColor": "#3b82f6",
  "createdAt": "2026-06-11T10:00:00Z",
  "updatedAt": "2026-06-11T10:00:00Z"
}
```

#### Create/Update Business

```http
POST /api/business
Content-Type: application/json

{
  "businessName": "John's Consulting",
  "businessSlug": "john-doe",
  "logoUrl": "https://example.com/logo.png",
  "brandColor": "#3b82f6"
}
```

### Calendar Management

#### Get Connected Calendar

```http
GET /api/calendar
```

**Response** (200):
```json
{
  "id": 1,
  "calendarId": "user@gmail.com",
  "timezone": "America/New_York",
  "workingHoursStart": 9,
  "workingHoursEnd": 17,
  "connected": true
}
```

#### Connect Google Calendar

Start the OAuth flow:

```http
GET /api/calendar/auth-url
```

Returns redirect URL to Google OAuth.

#### Save Google Calendar Token

Called after OAuth callback:

```http
POST /api/calendar/connect
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "timezone": "America/New_York",
  "workingHoursStart": 9,
  "workingHoursEnd": 17
}
```

#### Update Calendar Settings

```http
PUT /api/calendar/settings
Content-Type: application/json

{
  "workingHoursStart": 8,
  "workingHoursEnd": 18,
  "timezone": "America/Chicago"
}
```

#### Disconnect Calendar

```http
DELETE /api/calendar
```

### Appointment Management

#### List Appointments

```http
GET /api/appointments?status=confirmed&limit=10&offset=0
```

**Query Parameters**:
- `status` (optional): Filter by status (confirmed, cancelled, completed)
- `limit` (optional): Max results, default 10
- `offset` (optional): Pagination offset, default 0

**Response** (200):
```json
{
  "appointments": [
    {
      "id": 1,
      "customerName": "Jane Smith",
      "customerEmail": "jane@example.com",
      "customerPhone": "+1-555-0100",
      "eventStart": "2026-06-15T10:00:00Z",
      "eventEnd": "2026-06-15T10:30:00Z",
      "status": "confirmed",
      "notes": "Please arrive 5 minutes early",
      "reminderSent": false,
      "createdAt": "2026-06-11T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Appointment

```http
GET /api/appointments/:id
```

#### Update Appointment

```http
PUT /api/appointments/:id
Content-Type: application/json

{
  "status": "cancelled",
  "notes": "Rescheduled to next week"
}
```

**Allowed Status Values**:
- `confirmed` - Booking confirmed
- `cancelled` - Booking cancelled
- `completed` - Appointment completed
- `no-show` - Customer didn't show up

### Branding

#### Update Branding

```http
PUT /api/branding
Content-Type: application/json

{
  "brandColor": "#ec4899",
  "logoUrl": "https://example.com/logo.png"
}
```

### Google OAuth URL

Get the Google OAuth authorization URL to start the OAuth flow:

```http
GET /api/auth/google/url
```

**Response** (200):
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Errors**:
- 401: Not authenticated
- 400: Google OAuth not configured (missing GOOGLE_CLIENT_ID)

---

## Admin Endpoints (Protected)

These endpoints require authentication and admin privileges (user email contains "admin").

### Admin Dashboard

```http
GET /admin
```

Returns the admin panel with:
- Total users, businesses, appointments
- Active trials and paid users
- User list with business info and plan status
- Recent appointments across all businesses

### Manual Blocks

Block time periods when you're unavailable.

#### Create Block

```http
POST /api/blocks
Content-Type: application/json

{
  "blockStart": "2026-06-20T00:00:00Z",
  "blockEnd": "2026-06-21T23:59:59Z",
  "reason": "Vacation"
}
```

#### List Blocks

```http
GET /api/blocks?month=6&year=2026
```

#### Delete Block

```http
DELETE /api/blocks/:id
```

---

## Server Actions

Next.js Server Actions provide a type-safe alternative to REST API routes.

### User Actions

```typescript
// lib/actions/users.ts
import { createBusiness, getBusiness, updateBusiness } from '@/app/actions/users'

// Create or update business
await createBusiness({
  businessName: "John's Consulting",
  businessSlug: "john-doe"
})

// Get business
const business = await getBusiness()
```

### Calendar Actions

```typescript
// lib/actions/calendar.ts
import { connectGoogleCalendar, getConnectedCalendar } from '@/app/actions/calendar'

// Connect calendar
await connectGoogleCalendar(
  'user@gmail.com',
  'access_token',
  'refresh_token',
  1718123456000,
  'America/New_York',
  9,
  17
)

// Get calendar
const calendar = await getConnectedCalendar()
```

### Appointment Actions

```typescript
// lib/actions/appointments.ts
import { 
  getAvailableSlots, 
  createAppointment, 
  getAppointments 
} from '@/app/actions/appointments'

// Get available slots
const slots = await getAvailableSlots('john-doe', new Date('2026-06-15'))

// Create appointment
const appointment = await createAppointment({
  businessSlug: 'john-doe',
  customerName: 'Jane Smith',
  customerEmail: 'jane@example.com',
  customerPhone: '+1-555-0100',
  eventStart: new Date('2026-06-15T10:00:00Z'),
  duration: 30
})

// Get appointments
const appointments = await getAppointments()
```

### Branding Actions

```typescript
// lib/actions/branding.ts
import { updateBusinessBranding, getBusinessBranding } from '@/app/actions/branding'

// Update branding
await updateBusinessBranding({
  brandColor: '#ec4899',
  logoUrl: 'https://example.com/logo.png'
})

// Get branding
const branding = await getBusinessBranding('john-doe')
```

---

## Error Responses

All endpoints return standard error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": "Missing required field: businessSlug"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "details": "Please sign in to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied",
  "details": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "details": "Business not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict",
  "details": "Time slot is no longer available"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "details": "Something went wrong"
}
```

---

## Rate Limiting

Public endpoints are rate limited:
- 60 requests per minute per IP for `/api/book/*`
- 30 requests per minute per IP for Google OAuth

Protected endpoints:
- 100 requests per minute per user for `/api/appointments`
- 50 requests per minute per user for `/api/calendar`

---

## Webhooks

### Stripe Webhooks

Endpoint: `POST /api/webhooks/stripe`

**Events**:
- `checkout.session.completed` - Payment successful
- `payment_intent.failed` - Payment failed
- `customer.subscription.updated` - Subscription updated

### Twilio Webhooks

Endpoint: `POST /api/webhooks/twilio`

**Events**:
- SMS replies from customers
- Delivery status updates

---

## Best Practices

### Authentication
- Store session tokens securely (httpOnly cookies)
- Refresh tokens automatically before expiry
- Always validate origin on OAuth callbacks

### Rate Limiting
- Implement exponential backoff for retries
- Cache frequently requested data
- Use pagination for large result sets

### Error Handling
- Always check error response structure
- Implement proper error logging
- Show user-friendly error messages

### Data Validation
- Validate all inputs on the client
- Validate again on the server
- Sanitize user inputs

### Performance
- Use pagination for list endpoints
- Cache calendar data when possible
- Batch database queries

---

## SDKs & Libraries

### JavaScript/TypeScript
```typescript
// Using fetch
const response = await fetch('/api/appointments', {
  headers: { 'Content-Type': 'application/json' }
})
const data = await response.json()

// Using Server Actions (recommended)
import { getAppointments } from '@/app/actions/appointments'
const appointments = await getAppointments()
```

### cURL
```bash
# Create appointment
curl -X POST http://localhost:3000/api/book/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessSlug": "john-doe",
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "customerPhone": "+1-555-0100",
    "eventStart": "2026-06-15T10:00:00Z",
    "duration": 30
  }'
```

---

## API Version

Current version: **v1**

No breaking changes planned for stable features.

---

**Need help?** Check the full README.md or QUICKSTART.md files.
