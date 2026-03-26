# 1Another

A church event discovery and management platform. Browse events from local churches, RSVP, follow churches, and manage recurring event series — available as a web app and on Android & iOS via [Capacitor](https://capacitorjs.com).

## Features

- **Event discovery** — Browse, search, and filter upcoming church events by type, date, and category
- **Event management** — Create, edit, and cancel events with optional registration, capacity limits, and custom attendee fields
- **Series** — Group recurring events into series with configurable cadences (weekly, biweekly, monthly)
- **Churches** — Browse church profiles, view service times, and follow churches
- **Roles** — Three-tier role system: `ATTENDEE`, `ORGANISER`, and `ADMIN`
- **Authentication** — Email/password sign-up and OAuth via [Auth.js v5](https://authjs.dev)
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
| Testing | Jest + Testing Library |

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Android Studio or Xcode (for mobile development)

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
components/       # Shared UI components
lib/
  actions/        # Server actions
  data/           # Data fetching helpers
  hooks/          # Custom React hooks
  validations/    # Zod schemas
prisma/
  schema.prisma   # Database schema
  seed.ts         # Database seed script
```

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
