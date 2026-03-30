# 1Another

A church event discovery and management platform. Browse events from local churches, RSVP, follow churches, and manage recurring event series — available as a web app and on Android & iOS via [Capacitor](https://capacitorjs.com).

## Features

- **Event discovery** — Browse, search, and filter upcoming church events by type, date, and category
- **Event management** — Create, edit, and cancel events with optional registration, capacity limits, and custom attendee fields
- **Series** — Group recurring events into series with configurable cadences (weekly, biweekly, monthly)
- **Churches** — Browse church profiles, view service times, and follow churches
- **Roles** — Three-tier role system: `ATTENDEE`, `ORGANISER`, and `ADMIN`
- **Authentication** — Email/password sign-up and OAuth via [Auth.js v5](https://authjs.dev)
- **Push notifications** — Event reminders sent via FCM to Android and iOS devices, with per-user opt-out preferences
- **Mobile** — Native Android and iOS apps via Capacitor

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | Radix UI / shadcn |
| Auth | Auth.js (NextAuth v5) |
| Database | PostgreSQL via [Prisma](https://www.prisma.io) |
| Forms | React Hook Form + Zod |
| Mobile | Capacitor (Android & iOS) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Testing | Jest + Testing Library |

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Android Studio or Xcode (for mobile development)
- Firebase project (for push notifications)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/oneanother"
AUTH_SECRET="your-auth-secret"

# Firebase (push notifications)
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run cron` | Start the push notification worker (long-lived process) |

## Project Structure

```
app/
  (app)/          # Authenticated app routes
    churches/     # Church browsing & profiles
    events/       # Event detail pages
    my-events/    # Attended & created events
    organiser/    # Organiser dashboard
    series/       # Event series
    admin/        # Admin panel
    profile/      # User profile
  (auth)/         # Unauthenticated routes (login, register)
  api/auth/       # Auth.js route handler
components/
  push-notification-provider.tsx  # Capacitor permission + FCM token registration
  notification-settings.tsx       # Per-user notification preference UI
lib/
  actions/        # Server actions
    notifications.ts  # Save/fetch notification preferences
  data/           # Data fetching helpers
  hooks/          # Custom React hooks
  validations/    # Zod schemas
  firebase-admin.ts       # Firebase Admin SDK singleton
  notifications.ts        # FCM multicast send + stale token cleanup
  schedule-notification.ts # Schedule / cancel ScheduledNotification rows
  notification-types.ts   # Notification type keys and metadata
app/
  api/push/
    register-token/  # POST — upsert device token for authenticated user
    unregister-token/# POST — remove token on sign-out
  (app)/profile/
    notifications/   # User notification preferences page
scripts/
  event-reminders-cron.ts  # Standalone cron worker (runs outside Next.js)
prisma/
  schema.prisma   # Database schema
  seed.ts         # Database seed script
```

## Push Notifications

Push notifications are delivered via [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging) and work on both Android and iOS native builds.

### How it works

1. **Token registration** — When the app opens on a native device, `PushNotificationProvider` requests permission and registers with FCM. The FCM token is sent to `/api/push/register-token` and stored in the `PushToken` table.
2. **Scheduling** — Server actions write rows to the `ScheduledNotification` table when users attend events. Each row contains the user ID, notification type, scheduled time, and message payload.
3. **Delivery** — `npm run cron` runs a long-lived Node.js process that polls `ScheduledNotification` every minute, checks the user's opt-out preferences, and sends via `firebase-admin` `sendEachForMulticast`.
4. **Stale token cleanup** — Tokens that FCM rejects as invalid or unregistered are automatically deleted from the database.

### Notification types

| Type | When sent |
|---|---|
| `EVENT_REMINDER_24H` | 24 hours before the event starts |
| `EVENT_REMINDER_1H` | 1 hour before the event starts |
| `EVENT_CANCELLED` | When an organiser cancels an event |
| `EVENT_UPDATED` | When an organiser edits key event details |

### Firebase setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add Android and iOS apps using bundle ID `com.oneanother.app`.
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) and place them in the respective native project directories.
4. Generate a service account key: **Project Settings → Service Accounts → Generate new private key**.
5. Add the three `FIREBASE_*` variables from the downloaded JSON to `.env.local`.

> **Important:** `FIREBASE_PRIVATE_KEY` must use literal `\n` for newlines in `.env.local`, not actual line breaks.

### Running the cron worker

The cron worker is a standalone Node.js process — it must run alongside the Next.js server in production:

```bash
npm run cron
```

The worker polls once per minute. The `noOverlap: true` option prevents overlapping runs if a batch takes longer than a minute to process.

In production, run it as a separate process or systemd service alongside the Next.js server. It reads `DATABASE_URL` and the `FIREBASE_*` variables from the environment.

### User preferences

Users can opt out of individual notification types at **Profile → Notifications**. The opt-out model means all notifications are enabled by default; a `NotificationPreference` row is only written when the user disables a type. The cron worker checks preferences at send time, so changes take effect immediately even for already-scheduled notifications.

## Mobile (Capacitor)

The app is configured as a Capacitor project under the app ID `com.oneanother.app`.

**Android:**
```bash
npx cap sync android
npx cap open android
```

**iOS:**
```bash
npx cap sync ios
npx cap open ios
```

For local development with a physical device, update the `server.url` in `capacitor.config.ts` to your machine's local IP address.
