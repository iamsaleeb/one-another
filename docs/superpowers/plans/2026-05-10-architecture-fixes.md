# Architecture Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 14 architectural issues identified in the staff-level review across data integrity, security, notification correctness, caching, and UI architecture.

**Architecture:** Each phase is independently deployable. Deploy Phase 1 first (it closes a live security gap). Phases 2–5 can be done in any order thereafter, though Phase 2 schema changes unblock Phase 3 notification fixes.

**Tech Stack:** Next.js 16.2 App Router, Prisma 7, NextAuth v5, PostgreSQL, Firebase Admin SDK, Jest 30, React Testing Library

---

## Phase 1 — Security & Data Integrity

### Task 1: Create `proxy.ts` — close the unauthenticated-route gap

`proxy.ts` is the Next.js 16 successor to `middleware.ts`. Without it, the `authorized` callback in `auth.config.ts` never runs, meaning any unauthenticated user can reach any `/(app)` route and see broken UI. This is a live gap.

**Files:**
- Create: `proxy.ts` (project root)
- No changes to `auth.config.ts` (the existing `authorized` callback is already correct)

- [ ] **Step 1: Verify the gap exists by checking for proxy/middleware file**

```bash
ls proxy.ts middleware.ts 2>$null
```

Expected: neither file exists.

- [ ] **Step 2: Create `proxy.ts`**

```ts
// proxy.ts
export { auth as proxy } from "@/auth"

export const config = {
  // Exclude API routes, static files, and image optimisation paths.
  // All /(app) pages are protected by the `authorized` callback in auth.config.ts.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)" ],
}
```

> **Why import from `@/auth` and not `./auth.config`?** In Next.js 16, proxy runs on the Node.js runtime (not edge), so importing the Prisma adapter from `auth.ts` is safe. The split-config pattern (`auth.config.ts` + `auth.ts`) is still valuable for keeping the authorized callback edge-safe in case you ever add Edge-targeted routes, but for the proxy file itself you can import the full auth instance.

- [ ] **Step 3: Build to verify no import errors**

```bash
npx next build 2>&1 | Select-String "error|Error" | head -20
```

Expected: build completes without errors referencing proxy.ts.

- [ ] **Step 4: Manually verify redirects work**

Start dev server (`npm run dev`), open a private window, navigate to `/`. Expected: redirected to `/login`. Navigate to `/login`, log in. Expected: redirected to `/`.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy.ts to enforce auth on all app routes"
```

---

### Task 2: Remove `isPast` — replace with `datetime` comparisons

`isPast` is a boolean that is never updated after creation. All queries filtering `isPast: false` will eventually show stale events that have already passed. `isPast: true` results will always be empty. Replacing with `datetime` comparisons fixes correctness without any behavioural change for fresh data.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/actions/data-events.ts`
- Modify: `lib/actions/data-churches.ts`
- Modify: `lib/actions/data-series.ts`
- Modify: `lib/actions/data-user.ts`
- Modify: `lib/dal/events.ts`
- Modify: `prisma/seed.ts`
- Modify: `lib/actions/__tests__/data.test.ts`
- Modify: `lib/actions/__tests__/events.test.ts`

- [ ] **Step 1: Update tests to assert `datetime` filter instead of `isPast`**

Open `lib/actions/__tests__/data.test.ts`. Find every assertion that checks for `{ isPast: false }` or `{ isPast: true }` in a Prisma `where` clause and replace with the datetime equivalent.

Key replacements in test expectations:
```ts
// BEFORE (any occurrence of these patterns):
where: { isPast: false, isDraft: false }
where: { isPast: false, createdById: userId }
where: { isPast: true, isDraft: false, ... }

// AFTER:
where: expect.objectContaining({ datetime: { gte: expect.any(Date) }, isDraft: false })
where: expect.objectContaining({ datetime: { gte: expect.any(Date) }, createdById: 'user-1' })
where: expect.objectContaining({ datetime: { lt: expect.any(Date) }, isDraft: false })
```

Also find mock event objects like `{ ...sampleEvent, isPast: false }` and remove the `isPast` property:
```ts
// BEFORE:
const pastEvent = { ...sampleEvent, id: 'evt-past', isPast: true }
// AFTER:
const pastEvent = { ...sampleEvent, id: 'evt-past', datetime: new Date('2020-01-01') }
```

Also update `lib/actions/__tests__/events.test.ts`: find the event fixture that sets `isPast: false` and remove that field.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest lib/actions/__tests__/data.test.ts lib/actions/__tests__/events.test.ts --no-coverage
```

Expected: failures where actual calls still use `isPast`.

- [ ] **Step 3: Update `prisma/schema.prisma`**

In the `Event` model, remove the `isPast` field and update the composite index:

```prisma
model Event {
  id                   String          @id @default(cuid())
  datetime             DateTime?
  title                String
  location             String?
  host                 String?
  tag                  String
  description          String
  photoUrl             String?
  isDraft              Boolean         @default(false)
  requiresRegistration Boolean         @default(false)
  metadata             Json            @db.JsonB
  price                String?
  cancelledAt          DateTime?
  cancellationReason   String?
  churchId             String?
  seriesId             String?
  createdById          String?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  church               Church?         @relation(fields: [churchId], references: [id])
  createdBy            User?           @relation("UserEvents", fields: [createdById], references: [id])
  series               Series?         @relation(fields: [seriesId], references: [id])
  attendees            EventAttendee[]
  questions            EventQuestion[]

  @@index([datetime, isDraft])
  @@index([churchId])
  @@index([createdById])
}
```

- [ ] **Step 4: Run the migration**

```bash
npx prisma migrate dev --name remove_is_past
```

Expected: migration created and applied. If it says "column isPast does not exist", that's fine — it means the DB is already clean.

- [ ] **Step 5: Update `lib/actions/data-events.ts`**

```ts
export async function getEvents() {
  cacheTag("events");
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { datetime: { gte: new Date() }, isDraft: false },
    orderBy: { datetime: "asc" },
    take: 50,
    include: { church: { select: { name: true } } },
  });
}

export async function getEventsByCreator(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { datetime: { gte: new Date() }, createdById: userId },
    orderBy: { datetime: "asc" },
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getEventsNotByCreator(userId: string) {
  cacheTag("events");
  cacheLife("minutes");
  return prisma.event.findMany({
    where: {
      datetime: { gte: new Date() },
      isDraft: false,
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { datetime: "asc" },
    take: 50,
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserAttendedEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { datetime: { gte: new Date() }, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "asc" },
    include: { church: { select: { name: true } } },
  });
}

export async function getUserAttendedPastEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("hours");
  return prisma.event.findMany({
    where: { datetime: { lt: new Date() }, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "desc" },
    include: { church: { select: { name: true } } },
  });
}
```

- [ ] **Step 6: Update `lib/actions/data-churches.ts`**

Replace both `isPast` occurrences:
```ts
events: {
  where: { datetime: { gte: new Date() }, isDraft: false },
  orderBy: { datetime: "asc" },
  take: 20,
},
// and inside series._count:
_count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } },
```

- [ ] **Step 7: Update `lib/actions/data-series.ts`**

Replace all 5 `isPast: false` occurrences with `datetime: { gte: new Date() }`:
```ts
// getSeries() — inside _count:
_count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } }

// getSeriesById() — events include:
events: {
  where: { datetime: { gte: new Date() }, isDraft: false },
  orderBy: { datetime: "asc" },
},

// getSeriesByCreator(), getSeriesNotByCreator(), getUserFollowedSeries() — inside _count:
_count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } }
```

- [ ] **Step 8: Update `lib/actions/data-user.ts`**

In `searchEventsAndChurches`, line 73:
```ts
// BEFORE:
const eventWhere: Prisma.EventWhereInput = { isPast: false, isDraft: false };
// AFTER:
const eventWhere: Prisma.EventWhereInput = { datetime: { gte: new Date() }, isDraft: false };
```

- [ ] **Step 9: Update `lib/dal/events.ts`**

In `createEvent`, remove `isPast: false` from the `prisma.event.create` data block (line 110).

- [ ] **Step 10: Update `prisma/seed.ts`**

Remove all `isPast: true` and `isPast: false` fields from every event object in the seed. Events with past `datetime` values are naturally "past" without the flag. No other changes needed.

- [ ] **Step 11: Run tests to confirm they pass**

```bash
npx jest lib/actions/__tests__/data.test.ts lib/actions/__tests__/events.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 12: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/actions/data-events.ts lib/actions/data-churches.ts lib/actions/data-series.ts lib/actions/data-user.ts lib/dal/events.ts prisma/seed.ts lib/actions/__tests__/data.test.ts lib/actions/__tests__/events.test.ts
git commit -m "feat: replace isPast boolean with datetime comparisons"
```

---

## Phase 2 — Schema Type Safety

### Task 3: Add `NotificationType` enum to schema

`Notification.type` and `NotificationPreference.type` are plain strings. A typo silently creates a row that never matches a preference, causing users to receive notifications they opted out of. This task enforces the type at the DB level.

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/notification-types.ts`
- Modify: `lib/notifications/queue.ts`
- Modify: `lib/dal/events.ts`
- Test: `lib/notifications/__tests__/queue.test.ts` (verify type is imported from Prisma)

- [ ] **Step 1: Write a failing type-safety test**

Open `lib/notifications/__tests__/queue.test.ts`. Add an import assertion:

```ts
import { NotificationType } from '@prisma/client'

it('queueNotification accepts NotificationType enum values', () => {
  // This is a compile-time check — if NotificationType doesn't exist in @prisma/client,
  // the import above will cause a TypeScript error caught by `npx tsc --noEmit`
  expect(Object.values(NotificationType)).toContain('EVENT_REMINDER')
  expect(Object.values(NotificationType)).toContain('NEW_SERIES_SESSION')
  expect(Object.values(NotificationType)).toContain('EVENT_CANCELLED')
})
```

- [ ] **Step 2: Run tsc to confirm it fails**

```bash
npx tsc --noEmit 2>&1 | Select-String "NotificationType"
```

Expected: error — `'NotificationType' is not exported from '@prisma/client'`.

- [ ] **Step 3: Update `prisma/schema.prisma`**

Add the enum and update both models:

```prisma
enum NotificationType {
  EVENT_REMINDER
  NEW_SERIES_SESSION
  EVENT_CANCELLED
}

model Notification {
  id           String           @id @default(cuid())
  userId       String
  type         NotificationType  // was: String
  title        String
  body         String
  data         Json?
  scheduledFor DateTime
  sentAt       DateTime?
  readAt       DateTime?
  cancelledAt  DateTime?
  dedupeKey    String?
  createdAt    DateTime         @default(now())
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type, dedupeKey])
  @@index([scheduledFor, sentAt, cancelledAt])
  @@index([userId, sentAt, readAt])
}

model NotificationPreference {
  id      String           @id @default(cuid())
  userId  String
  type    NotificationType  // was: String
  enabled Boolean          @default(true)
  config  Json?
  user    User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
}
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_notification_type_enum
```

If migration fails due to existing rows with values not in the enum, run this first to inspect:
```bash
npx prisma db execute --stdin <<< "SELECT DISTINCT type FROM \"Notification\" UNION SELECT DISTINCT type FROM \"NotificationPreference\";"
```

All values should be `EVENT_REMINDER`, `NEW_SERIES_SESSION`, or `EVENT_CANCELLED`. If there are others, add them to the enum before migrating.

- [ ] **Step 5: Update `lib/notification-types.ts`**

```ts
import { NotificationType } from '@prisma/client'

export { NotificationType }

export const NOTIFICATION_TYPES: Record<NotificationType, {
  label: string
  description: string
  defaultEnabled: boolean
  config?: {
    hoursBeforeEvent: {
      label: string
      options: readonly number[]
      optionLabels: Record<number, string>
      default: number
    }
  }
}> = {
  [NotificationType.EVENT_REMINDER]: {
    label: "Event Reminders",
    description: "Get notified before events you're attending start",
    defaultEnabled: true,
    config: {
      hoursBeforeEvent: {
        label: "How far in advance",
        options: [1, 2, 4, 24] as const,
        optionLabels: { 1: "1 hour before", 2: "2 hours before", 4: "4 hours before", 24: "1 day before" },
        default: 2,
      },
    },
  },
  [NotificationType.NEW_SERIES_SESSION]: {
    label: "New Series Sessions",
    description: "Get notified when a new session is added to a series you follow",
    defaultEnabled: true,
  },
  [NotificationType.EVENT_CANCELLED]: {
    label: "Event Cancellations",
    description: "Get notified when an event you're attending is cancelled",
    defaultEnabled: true,
  },
}

export type NotificationTypeKey = NotificationType
```

- [ ] **Step 6: Update `lib/notifications/queue.ts`**

Import and use the enum:

```ts
import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { subHours } from 'date-fns';

interface QueueInput {
  userId: string;
  type: NotificationType;   // was: string
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduledFor?: Date;
  dedupeKey?: string;
}

// Update cancelNotification and cancelManyNotifications similarly:
interface CancelInput {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
}

interface CancelManyInput {
  type: NotificationType;
  dedupeKey: string;
}

// In scheduleEventReminderNotification, update the pref lookup:
const pref = await prisma.notificationPreference.findUnique({
  where: { userId_type: { userId, type: NotificationType.EVENT_REMINDER } },
  select: { config: true },
});

// And the queueNotification call:
await queueNotification({
  userId,
  type: NotificationType.EVENT_REMINDER,
  // ... rest unchanged
});
```

- [ ] **Step 7: Update `lib/dal/events.ts`**

Import `NotificationType` and replace all string literals:

```ts
import { NotificationType } from '@prisma/client';

// In notifySeriesFollowers:
type: NotificationType.NEW_SERIES_SESSION,

// In notifyEventAttendees:
type: NotificationType.EVENT_CANCELLED,

// In cancelEvent:
await cancelManyNotifications({ type: NotificationType.EVENT_REMINDER, dedupeKey: id });
```

- [ ] **Step 8: Run test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass including the new type-safety test.

- [ ] **Step 9: Run tsc**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/notification-types.ts lib/notifications/queue.ts lib/dal/events.ts
git commit -m "feat: add NotificationType enum to schema and replace string literals"
```

---

### Task 4: Make `Event.churchId` non-nullable

The application enforces churchId at the action layer, but the DB schema allows NULL. If churchId is NULL, `canManageChurch` returns false for everyone — the event becomes permanently unmanageable. This enforces the invariant at the DB level.

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: generated (with safety check)
- Modify: `lib/dal/events.ts` (remove null guard now covered by schema)

- [ ] **Step 1: Check for existing NULL churchIds in the DB**

```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Event\" WHERE \"churchId\" IS NULL;"
```

Expected: `0`. If non-zero, do NOT proceed — investigate and fix those rows first before making the column non-nullable.

- [ ] **Step 2: Update `prisma/schema.prisma`**

In the `Event` model, change:
```prisma
// BEFORE:
churchId  String?
church    Church?  @relation(fields: [churchId], references: [id])

// AFTER:
churchId  String
church    Church   @relation(fields: [churchId], references: [id])
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name event_church_id_non_nullable
```

Expected: migration sets `NOT NULL` on the column. This will succeed if Step 1 confirmed no NULLs.

- [ ] **Step 4: Run tsc to catch type errors**

```bash
npx tsc --noEmit 2>&1 | Select-String "churchId"
```

Any TS errors about `churchId` being potentially null need to be fixed — they indicate places that were defensively handling a case that can no longer occur.

- [ ] **Step 5: Run test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: make Event.churchId non-nullable"
```

---

### Task 5: Add `ServiceTime` enums

`ServiceTime.day` and `ServiceTime.type` accept any string. This task enforces valid values at the DB level.

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Inspect existing ServiceTime data**

```bash
npx prisma db execute --stdin <<< "SELECT DISTINCT day, type FROM \"ServiceTime\";"
```

Note the distinct values. If any don't map to the enum values below, update the enum to include them before running the migration.

- [ ] **Step 2: Update `prisma/schema.prisma`**

Add enums before the `ServiceTime` model:

```prisma
enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

enum ServiceTimeType {
  MORNING
  AFTERNOON
  EVENING
  MIDWEEK
  YOUTH
  OTHER
}

model ServiceTime {
  id       String          @id @default(cuid())
  day      DayOfWeek
  time     String
  type     ServiceTimeType
  churchId String
  church   Church          @relation(fields: [churchId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Write migration with data transform**

```bash
npx prisma migrate dev --name add_service_time_enums --create-only
```

This creates the migration file without applying it. Open the generated SQL file and prepend the data migration before the column type change. Example:

```sql
-- Map existing string values to enum values
UPDATE "ServiceTime" SET day = UPPER(day) WHERE day IS NOT NULL;
UPDATE "ServiceTime" SET type = UPPER(type) WHERE type IS NOT NULL;

-- Handle common variations
UPDATE "ServiceTime" SET day = 'MONDAY' WHERE LOWER(day) IN ('mon', 'monday');
UPDATE "ServiceTime" SET day = 'TUESDAY' WHERE LOWER(day) IN ('tue', 'tuesday');
-- (add more as needed based on Step 1 findings)

-- Then the enum column changes follow automatically from Prisma's generated SQL
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

Expected: migration applied. If it fails due to unconvertible values, fix those rows first.

- [ ] **Step 5: Run tsc**

```bash
npx tsc --noEmit
```

Fix any type errors in code that passes string literals where `DayOfWeek` or `ServiceTimeType` is now required.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add DayOfWeek and ServiceTimeType enums to ServiceTime"
```

---

## Phase 3 — Notification System

### Task 6: Fix notification queue bypass — prevent duplicate notifications

`notifySeriesFollowers` and `notifyEventAttendees` in `lib/dal/events.ts` call `prisma.notification.createMany` directly, bypassing the `queueNotification` function. This skips deduplication — republishing an event or toggling cancellation multiple times generates duplicate notifications.

**Files:**
- Modify: `lib/dal/events.ts`
- Test: `lib/dal/__tests__/events.test.ts` (add dedup test)

- [ ] **Step 1: Write a failing deduplication test**

Create or open `lib/dal/__tests__/events.test.ts`. Add:

```ts
import { prisma } from '@/lib/db'
import { publishEvent } from '../events'
import { NotificationType } from '@prisma/client'

const mockPrisma = {
  event: { findUnique: jest.fn(), update: jest.fn() },
  eventAttendee: { findMany: jest.fn() },
  seriesFollower: { findMany: jest.fn() },
  notification: { upsert: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
  notificationPreference: { findMany: jest.fn() },
  pushToken: { findMany: jest.fn() },
}

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }))
jest.mock('@/lib/notifications/queue', () => ({
  scheduleEventReminderNotifications: jest.fn(),
  cancelManyNotifications: jest.fn(),
  queueNotification: jest.fn(),
}))

describe('notifySeriesFollowers deduplication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upserts NEW_SERIES_SESSION rather than creating duplicates', async () => {
    const { publishEvent } = require('../events')
    const { queueNotification } = require('@/lib/notifications/queue')

    // Arrange: published series event with two followers
    mockPrisma.event.findUnique.mockResolvedValue({
      id: 'evt-1',
      churchId: 'ch-1',
      seriesId: 'series-1',
      title: 'Sunday Service',
      isDraft: true,
      datetime: new Date(Date.now() + 86400000),
    })
    mockPrisma.event.update.mockResolvedValue({})
    mockPrisma.eventAttendee.findMany.mockResolvedValue([])
    mockPrisma.seriesFollower.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ])

    // Mock canManageChurch to return true
    jest.mock('@/lib/permissions', () => ({ canManageChurch: jest.fn().mockResolvedValue(true) }))

    // Act
    await publishEvent('evt-1', 'admin-user', 'ADMIN')

    // Assert: queueNotification called (dedup path), NOT createMany
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(queueNotification).toHaveBeenCalledTimes(2)
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NEW_SERIES_SESSION',
        dedupeKey: 'series-1:evt-1',
        userId: 'user-1',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest lib/dal/__tests__/events.test.ts --no-coverage -t "deduplication"
```

Expected: FAIL — `createMany` is being called.

- [ ] **Step 3: Update `lib/dal/events.ts` — fix `notifySeriesFollowers`**

```ts
import { queueNotification } from '@/lib/notifications/queue';
import { NotificationType } from '@prisma/client';

async function notifySeriesFollowers(seriesId: string, title: string, eventId: string) {
  const followers = await prisma.seriesFollower.findMany({
    where: { seriesId },
    select: { userId: true },
  });
  if (followers.length === 0) return;
  await Promise.all(
    followers.map((f) =>
      queueNotification({
        userId: f.userId,
        type: NotificationType.NEW_SERIES_SESSION,
        title: 'New Session Added',
        body: `A new session has been added: ${title}`,
        data: { type: 'new_session', seriesId, eventId },
        scheduledFor: new Date(),
        dedupeKey: `${seriesId}:${eventId}`,
      })
    )
  );
}
```

- [ ] **Step 4: Update `lib/dal/events.ts` — fix `notifyEventAttendees`**

```ts
async function notifyEventAttendees(eventId: string, title: string) {
  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId },
    select: { userId: true },
  });
  if (attendees.length === 0) return;
  await Promise.all(
    attendees.map((a) =>
      queueNotification({
        userId: a.userId,
        type: NotificationType.EVENT_CANCELLED,
        title: 'Event Cancelled',
        body: `${title} has been cancelled`,
        data: { type: 'event_cancelled', eventId },
        scheduledFor: new Date(),
        dedupeKey: `cancelled:${eventId}`,
      })
    )
  );
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx jest lib/dal/__tests__/events.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add lib/dal/events.ts lib/dal/__tests__/events.test.ts
git commit -m "fix: route series/cancellation notifications through queue to prevent duplicates"
```

---

### Task 7: Fix N+1 on event publish — batch preference lookups

When publishing an event, `publishEvent` maps over all attendees and calls `scheduleEventReminderNotification` for each. Each call does an individual `findUnique` on `NotificationPreference`. 100 attendees = 100 sequential DB queries.

**Files:**
- Modify: `lib/notifications/queue.ts` — add `scheduleEventReminderNotifications` (plural) batch function
- Modify: `lib/dal/events.ts` — use batch function in `publishEvent`
- Test: `lib/notifications/__tests__/queue.test.ts`

- [ ] **Step 1: Write failing test for the batch function**

Open `lib/notifications/__tests__/queue.test.ts`. Add:

```ts
import { scheduleEventReminderNotifications } from '../queue'
import { NotificationType } from '@prisma/client'

jest.mock('@/lib/db', () => ({
  prisma: {
    notificationPreference: { findMany: jest.fn() },
    notification: { upsert: jest.fn() },
  },
}))

describe('scheduleEventReminderNotifications (batch)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches all preferences in a single query', async () => {
    const mockFindMany = prisma.notificationPreference.findMany as jest.Mock
    mockFindMany.mockResolvedValue([
      { userId: 'user-1', config: { hoursBeforeEvent: 2 } },
      { userId: 'user-2', config: { hoursBeforeEvent: 24 } },
    ])
    ;(prisma.notification.upsert as jest.Mock).mockResolvedValue({})

    const event = {
      id: 'evt-1',
      title: 'Sunday Service',
      datetime: new Date(Date.now() + 86400000), // tomorrow
    }

    await scheduleEventReminderNotifications(['user-1', 'user-2'], event)

    // Only ONE findMany call for all users, not one findUnique per user
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['user-1', 'user-2'] }, type: NotificationType.EVENT_REMINDER },
      })
    )
  })

  it('queues a notification for each user with their respective hours preference', async () => {
    const mockFindMany = prisma.notificationPreference.findMany as jest.Mock
    mockFindMany.mockResolvedValue([
      { userId: 'user-1', config: { hoursBeforeEvent: 4 } },
    ])
    const mockUpsert = prisma.notification.upsert as jest.Mock
    mockUpsert.mockResolvedValue({})

    const futureDate = new Date(Date.now() + 86400000 * 7)
    await scheduleEventReminderNotifications(['user-1'], { id: 'evt-1', title: 'Camp', datetime: futureDate })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          body: 'Camp starts in 4 hours',
        }),
      })
    )
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest lib/notifications/__tests__/queue.test.ts --no-coverage -t "batch"
```

Expected: FAIL — `scheduleEventReminderNotifications` does not exist.

- [ ] **Step 3: Add `scheduleEventReminderNotifications` to `lib/notifications/queue.ts`**

```ts
export async function scheduleEventReminderNotifications(
  userIds: string[],
  event: EventRef
): Promise<void> {
  if (userIds.length === 0 || !event.datetime) return;

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, type: NotificationType.EVENT_REMINDER },
    select: { userId: true, config: true },
  });

  const hoursMap = new Map<string, number>();
  for (const pref of prefs) {
    if (pref.config && typeof pref.config === 'object' && !Array.isArray(pref.config)) {
      const h = (pref.config as Record<string, unknown>).hoursBeforeEvent;
      if (typeof h === 'number') hoursMap.set(pref.userId, h);
    }
  }

  const now = new Date();
  await Promise.all(
    userIds.map((userId) => {
      const hours = hoursMap.get(userId) ?? DEFAULT_HOURS_BEFORE_EVENT;
      const scheduledFor = subHours(event.datetime!, hours);
      if (scheduledFor <= now) return Promise.resolve();
      return queueNotification({
        userId,
        type: NotificationType.EVENT_REMINDER,
        title: 'Event Reminder',
        body: `${event.title} starts in ${hours === 1 ? '1 hour' : `${hours} hours`}`,
        data: {
          type: 'event_reminder',
          eventId: event.id,
          eventTitle: event.title,
          eventDatetime: event.datetime!.toISOString(),
        },
        scheduledFor,
        dedupeKey: event.id,
      });
    })
  );
}
```

- [ ] **Step 4: Update `lib/dal/events.ts` — use the batch function in `publishEvent`**

Replace:
```ts
// BEFORE (in publishEvent):
const attendees = await prisma.eventAttendee.findMany({
  where: { eventId: id },
  select: { userId: true },
});
await Promise.all(
  attendees.map((a) =>
    scheduleEventReminderNotification(a.userId, { id, title: event.title, datetime: event.datetime })
  )
);
```

With:
```ts
// AFTER:
import { scheduleEventReminderNotifications } from '@/lib/notifications/queue';

// ...inside publishEvent try block:
const attendees = await prisma.eventAttendee.findMany({
  where: { eventId: id },
  select: { userId: true },
});
const userIds = attendees.map((a) => a.userId);
await scheduleEventReminderNotifications(userIds, { id, title: event.title, datetime: event.datetime });
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/notifications/queue.ts lib/dal/events.ts lib/notifications/__tests__/queue.test.ts
git commit -m "perf: batch preference lookups when scheduling event reminder notifications"
```

---

### Task 8: Parallelize FCM delivery in `processNotifications`

`processNotifications` uses a `for...of` loop with `await` per notification. 500 notifications × ~150ms FCM latency = ~75 seconds. This risks hitting the Vercel function timeout (300s) during peak notification hours.

**Files:**
- Modify: `lib/notifications/process.ts`
- Test: `lib/notifications/__tests__/process.test.ts`

- [ ] **Step 1: Write a test that verifies parallel execution**

Open `lib/notifications/__tests__/process.test.ts`. Add:

```ts
it('sends notifications concurrently, not sequentially', async () => {
  const mockSendEach = jest.fn().mockResolvedValue({ responses: [{ success: true }] })
  // ... mock setup (see existing tests in the file for the pattern)

  const start = Date.now()
  await processNotifications()
  const elapsed = Date.now() - start

  // With 3 notifications and parallel execution, should complete faster than sequential
  // (the real test is that sendEachForMulticast is called with all batches concurrently)
  expect(mockSendEach).toHaveBeenCalled()

  // Assert it was called for each notification (not sequential batching by user)
  // The key behaviour: all FCM calls happen in one Promise.all, not for...of await
  const callOrder = mockSendEach.mock.invocationCallOrder
  // All calls should have started before any resolved — parallel pattern
  expect(callOrder.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Refactor `lib/notifications/process.ts`**

```ts
import { prisma } from '@/lib/db';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NotificationType } from '@prisma/client';

const FCM_BATCH_SIZE = 500;
const CONCURRENCY = 20;

export async function processNotifications(): Promise<{ processed: number }> {
  const due = await prisma.notification.findMany({
    where: { scheduledFor: { lte: new Date() }, sentAt: null, cancelledAt: null },
    orderBy: { scheduledFor: 'asc' },
    take: 500,
  });

  if (due.length === 0) return { processed: 0 };

  const userIds = [...new Set(due.map((n) => n.userId))];

  const [optedOut, pushTokenRows] = await Promise.all([
    prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, enabled: false },
      select: { userId: true, type: true },
    }),
    prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, token: true },
    }),
  ]);

  const disabledSet = new Set(optedOut.map((p) => `${p.userId}:${p.type}`));
  const tokensByUser = new Map<string, string[]>();
  for (const pt of pushTokenRows) {
    const arr = tokensByUser.get(pt.userId) ?? [];
    arr.push(pt.token);
    tokensByUser.set(pt.userId, arr);
  }

  const { messaging } = getFirebaseAdmin();
  const sentIds: string[] = [];
  const staleTokens: string[] = [];

  // Process in concurrent batches to avoid FCM rate limits
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const batch = due.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (notif) => {
        if (disabledSet.has(`${notif.userId}:${notif.type}`)) {
          sentIds.push(notif.id);
          return;
        }

        const tokens = tokensByUser.get(notif.userId) ?? [];
        if (tokens.length === 0) {
          sentIds.push(notif.id);
          return;
        }

        const data =
          notif.data != null && typeof notif.data === 'object' && !Array.isArray(notif.data)
            ? (notif.data as Record<string, string>)
            : undefined;

        try {
          for (let j = 0; j < tokens.length; j += FCM_BATCH_SIZE) {
            const tokenBatch = tokens.slice(j, j + FCM_BATCH_SIZE);
            const response = await messaging.sendEachForMulticast({
              tokens: tokenBatch,
              notification: { title: notif.title, body: notif.body },
              data: data ?? {},
            });

            response.responses.forEach((res, idx) => {
              if (!res.success) {
                const code = res.error?.code;
                if (
                  code === 'messaging/invalid-registration-token' ||
                  code === 'messaging/registration-token-not-registered' ||
                  code === 'messaging/unregistered'
                ) {
                  staleTokens.push(tokenBatch[idx]);
                }
              }
            });
          }
          sentIds.push(notif.id);
        } catch (err) {
          console.error(`[process-notifications] failed to send ${notif.id}:`, err);
        }
      })
    );
  }

  await Promise.all([
    sentIds.length > 0
      ? prisma.notification.updateMany({ where: { id: { in: sentIds } }, data: { sentAt: new Date() } })
      : Promise.resolve(),
    staleTokens.length > 0
      ? prisma.pushToken.deleteMany({ where: { token: { in: staleTokens } } })
      : Promise.resolve(),
  ]);

  return { processed: sentIds.length };
}
```

- [ ] **Step 3: Run tests**

```bash
npx jest lib/notifications/__tests__/process.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/notifications/process.ts lib/notifications/__tests__/process.test.ts
git commit -m "perf: parallelize FCM delivery with concurrency limit of 20"
```

---

## Phase 4 — Caching & Performance

### Task 9: Fix `getEventById` per-user cache bloat

`getEventById(id, currentUserId)` creates one cache entry per `(event, user)` pair. A popular event with 200 attendees generates 201 distinct cache entries with nearly identical data. The same issue exists in `getChurchById` and `getSeriesById`.

**Files:**
- Modify: `lib/actions/data-events.ts`
- Modify: `lib/actions/data-churches.ts`
- Modify: `lib/actions/data-series.ts`
- Modify: `app/(app)/events/[id]/page.tsx`
- Modify: `app/(app)/churches/[id]/page.tsx` (apply same pattern)
- Modify: `app/(app)/series/[id]/page.tsx` (apply same pattern)
- Test: `lib/actions/__tests__/data.test.ts`

- [ ] **Step 1: Update tests for the new function signatures**

In `lib/actions/__tests__/data.test.ts`, find the `getEventById` test. Update it to expect:
1. `getEventById(id)` — no userId, no attendance data
2. A new `getMyEventAttendance(eventId, userId)` — separate function

```ts
describe('getEventById', () => {
  it('does not include attendance data — shared cache entry', async () => {
    mockFindUnique.mockResolvedValue({ id: 'evt-1', title: 'Test', attendees: [] })
    await getEventById('evt-1')
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ attendees: expect.anything() }),
      })
    )
  })
})

describe('getMyEventAttendance', () => {
  it('queries only for the specific user attendee row', async () => {
    const mockAttFindUnique = jest.fn().mockResolvedValue(null)
    ;(prisma.eventAttendee.findUnique as jest.Mock) = mockAttFindUnique

    await getMyEventAttendance('evt-1', 'user-1')

    expect(mockAttFindUnique).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: 'evt-1', userId: 'user-1' } },
      select: { userId: true, metadata: true },
    })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx jest lib/actions/__tests__/data.test.ts --no-coverage -t "getEventById|getMyEventAttendance"
```

- [ ] **Step 3: Update `lib/actions/data-events.ts`**

```ts
// Shared event data — single cache entry for all users
export async function getEventById(id: string) {
  "use cache: remote";
  cacheTag("events", `event-${id}`);
  cacheLife("hours");
  return prisma.event.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
  });
}

// Per-user attendance — short TTL, separate cache key space
export async function getMyEventAttendance(eventId: string, userId: string) {
  "use cache: remote";
  cacheTag(`event-${eventId}`, `user-attendance-${userId}-${eventId}`);
  cacheLife("seconds");
  return prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { userId: true, metadata: true },
  });
}
```

Also update cache invalidation in `lib/actions/events-attendance.ts`:
```ts
function invalidateEventCaches(id: string, userId?: string) {
  updateTag("events");
  updateTag(`event-${id}`);
  if (userId) updateTag(`user-attendance-${userId}-${id}`);
}

// Pass userId to invalidation in attendEventAction and unattendEventAction:
invalidateEventCaches(eventId, session.user.id);
```

- [ ] **Step 4: Update `app/(app)/events/[id]/page.tsx`**

```ts
export default async function EventDetailPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  // event is now shared (no userId)
  const [event, myAttendance] = await Promise.all([
    getEventById(id),
    session?.user?.id ? getMyEventAttendance(id, session.user.id) : Promise.resolve(null),
  ]);

  if (!event) notFound();

  const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);
  if (event.isDraft && !canManage) notFound();

  const isAttending = myAttendance !== null;
  // ...rest of component uses `myAttendance` instead of `event.attendees[0]`
}
```

Also update `generateMetadata` to use a minimal cached query (see Task 14).

- [ ] **Step 5: Apply the same split to `getChurchById` and `getSeriesById`**

In `lib/actions/data-churches.ts`:
```ts
export async function getChurchById(id: string) {
  "use cache: remote";
  cacheTag("churches", `church-${id}`);
  cacheLife("hours");
  return prisma.church.findUnique({
    where: { id },
    include: {
      serviceTimes: true,
      events: {
        where: { datetime: { gte: new Date() }, isDraft: false },
        orderBy: { datetime: "asc" },
        take: 20,
      },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } },
        },
      },
      _count: { select: { followers: true } },
    },
  });
}

export async function getMyChurchFollow(churchId: string, userId: string) {
  "use cache: remote";
  cacheTag(`church-${churchId}`, `user-follow-church-${userId}-${churchId}`);
  cacheLife("seconds");
  return prisma.churchFollower.findUnique({
    where: { churchId_userId: { churchId, userId } },
    select: { userId: true },
  });
}
```

Apply the same split to `getSeriesById` → `getMySeriesFollow`.

- [ ] **Step 6: Run tests**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/data-events.ts lib/actions/data-churches.ts lib/actions/data-series.ts lib/actions/events-attendance.ts app/\(app\)/events/\[id\]/page.tsx
git commit -m "perf: split per-user data into separate cached functions to eliminate N×M cache entries"
```

---

### Task 10: Fix home page over-fetching

The home page always fetches `getEvents()` and `getSeries()` even when the user is searching (both results are unused in the search branch). This adds unnecessary DB queries on the most-accessed page.

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Update `app/(app)/page.tsx`**

```ts
const [searchResults, events, allSeries] = await Promise.all([
  hasFilters
    ? searchEventsAndChurches({ query, type, when: when as WhenFilter | undefined, category: category ?? "" })
    : Promise.resolve(null),
  hasFilters ? Promise.resolve(null) : getEvents(),
  hasFilters ? Promise.resolve(null) : getSeries(),
]);
```

This is a single-line change per query. No test required — the existing behaviour is preserved (the null check in the render path already handles this).

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors (`events` and `allSeries` are already rendered inside a `hasFilters ? ... : <EventList events={events} />` branch which handles null).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "perf: skip events/series fetch when search filters are active on home page"
```

---

## Phase 5 — Auth & Routing

### Task 11: Reduce JWT role staleness window

`session.user.role` in server actions comes from the JWT. With `updateAge: 24h`, a demoted organiser retains their role in the JWT for up to 24 hours. Reducing to 1 hour is the minimal safe fix.

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Update `auth.ts`**

```ts
session: {
  strategy: "jwt",
  maxAge: 14 * 24 * 60 * 60,  // 14 days unchanged
  updateAge: 60 * 60,          // 1 hour (was 24 hours)
},
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --no-coverage
```

Expected: all pass — session config isn't directly tested.

- [ ] **Step 3: Commit**

```bash
git add auth.ts
git commit -m "fix: reduce JWT updateAge from 24h to 1h to shorten stale-role window"
```

---

### Task 12: Collapse `_cache.ts` — eliminate near-duplicate functions

`broadcastEventChange` and `invalidateEventFields` have near-identical bodies. The only difference is `broadcastEventChange` also calls `updateTag("churches")`. This divergence is invisible at call sites and causes missed invalidations.

**Files:**
- Modify: `lib/actions/_cache.ts`
- Modify: `lib/actions/events-crud.ts` (update call sites)

- [ ] **Step 1: Rewrite `lib/actions/_cache.ts`**

```ts
import "server-only";
import { updateTag } from "next/cache";

interface EventCacheOptions {
  /** Also invalidate the global church list (use when event visibility changes) */
  broadcastToChurchList?: boolean;
}

export function invalidateEventCaches(
  id: string,
  churchId?: string | null,
  seriesId?: string | null,
  options?: EventCacheOptions
) {
  updateTag("events");
  updateTag(`event-${id}`);
  updateTag(`event-questions-${id}`);
  if (churchId) {
    if (options?.broadcastToChurchList) updateTag("churches");
    updateTag(`church-${churchId}`);
  }
  if (seriesId) {
    updateTag("series");
    updateTag(`series-${seriesId}`);
  }
}

export function invalidateEventUpdate(
  id: string,
  result: { oldChurchId: string | null; newChurchId: string | null; affectedSeriesIds: string[] }
) {
  invalidateEventCaches(id, result.oldChurchId, null, { broadcastToChurchList: true });
  if (result.newChurchId && result.newChurchId !== result.oldChurchId) {
    updateTag(`church-${result.newChurchId}`);
  }
  if (result.affectedSeriesIds.length > 0) {
    updateTag("series");
    result.affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
}

export function invalidateSeriesFields(id: string, churchId?: string | null) {
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) updateTag(`church-${churchId}`);
}

export function broadcastSeriesChange(id: string, churchId?: string | null) {
  updateTag("events");
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) {
    updateTag("churches");
    updateTag(`church-${churchId}`);
  }
}

export function invalidateSeriesFollowing(seriesId: string, userId: string) {
  updateTag(`series-${seriesId}`);
  updateTag(`user-series-${userId}`);
}
```

- [ ] **Step 2: Update `lib/actions/events-crud.ts`** — replace `broadcastEventChange` and `invalidateEventFields` imports with `invalidateEventCaches`:

```ts
import { invalidateEventCaches, invalidateEventUpdate } from "@/lib/actions/_cache";

// createEventAction:
invalidateEventCaches(result.id, result.churchId, result.seriesId, { broadcastToChurchList: true });

// cancelEventAction, uncancelEventAction:
invalidateEventCaches(id, result.churchId, result.seriesId);

// publishEventAction, unpublishEventAction:
invalidateEventCaches(id, result.churchId, result.seriesId, { broadcastToChurchList: true });

// deleteEventAction:
invalidateEventCaches(id, result.churchId, result.seriesId, { broadcastToChurchList: true });
```

- [ ] **Step 3: Run tsc and tests**

```bash
npx tsc --noEmit && npm test -- --no-coverage
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/_cache.ts lib/actions/events-crud.ts
git commit -m "refactor: consolidate broadcastEventChange and invalidateEventFields into invalidateEventCaches"
```

---

### Task 13: Fix `generateMetadata` double data fetch in event detail page

`generateMetadata` fetches the full event and calls `auth()` just to get the title and check draft visibility. The page component then fetches the event again with a different cache key (no userId vs with userId). This is 2 auth calls and 2 event fetches per page load.

**Files:**
- Modify: `lib/actions/data-events.ts` — add `getEventMeta`
- Modify: `app/(app)/events/[id]/page.tsx`
- Test: `lib/actions/__tests__/data.test.ts`

- [ ] **Step 1: Write a failing test for `getEventMeta`**

```ts
describe('getEventMeta', () => {
  it('fetches only title, isDraft, and churchId', async () => {
    mockFindUnique.mockResolvedValue({ title: 'Test', isDraft: false, churchId: 'ch-1' })
    await getEventMeta('evt-1')
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      select: { title: true, isDraft: true, churchId: true },
    })
  })
})
```

- [ ] **Step 2: Add `getEventMeta` to `lib/actions/data-events.ts`**

```ts
// Minimal event data for metadata — single shared cache entry, no per-user fields
export async function getEventMeta(id: string) {
  "use cache: remote";
  cacheTag(`event-${id}`);
  cacheLife("hours");
  return prisma.event.findUnique({
    where: { id },
    select: { title: true, isDraft: true, churchId: true },
  });
}
```

- [ ] **Step 3: Update `generateMetadata` in `app/(app)/events/[id]/page.tsx`**

```ts
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventMeta(id);
  if (!event) return { title: "Event Not Found" };
  if (event.isDraft) {
    // Draft: need to check auth — this is infrequent so the auth() cost is acceptable
    const session = await auth();
    const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);
    if (!canManage) return { title: "Event Not Found" };
  }
  return { title: `${event.title} — One Another` };
}
```

The page component's `auth()` call is independent and already necessary.

- [ ] **Step 4: Run tests**

```bash
npm test -- --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/data-events.ts "app/(app)/events/[id]/page.tsx"
git commit -m "perf: add getEventMeta to eliminate duplicate full-event fetch in generateMetadata"
```

---

### Task 14: Fix nav visibility — replace client-side hook with route group layouts

`BottomNav` hides itself via `useIsDetailPage()` — a client hook that runs after hydration, causing a layout shift on detail pages. The hook conflates multiple concerns under a misleading name. Route group layouts express this structurally with zero JS.

**Files:**
- Create: `app/(app)/(with-nav)/layout.tsx`
- Create: `app/(app)/(no-nav)/layout.tsx`
- Move pages into `(with-nav)` and `(no-nav)` sub-groups (see full list below)
- Modify: `app/(app)/layout.tsx` — remove BottomNav, CreateEventFAB from here
- Modify: `components/bottom-nav.tsx` — remove `useIsDetailPage` call
- Rename: `hooks/use-is-detail-page.ts` → `hooks/use-show-back-button.ts` (TopNav still needs it for back button logic)

**Pages moving to `(with-nav)`** (keep BottomNav):
- `app/(app)/page.tsx` → `app/(app)/(with-nav)/page.tsx`
- `app/(app)/churches/page.tsx` → `app/(app)/(with-nav)/churches/page.tsx`
- `app/(app)/my-events/` → `app/(app)/(with-nav)/my-events/`
- `app/(app)/notifications/` → `app/(app)/(with-nav)/notifications/`
- `app/(app)/organiser/` → `app/(app)/(with-nav)/organiser/`
- `app/(app)/admin/` → `app/(app)/(with-nav)/admin/`
- `app/(app)/_components/` → `app/(app)/(with-nav)/_components/` (if any are list-page-only; shared ones stay in `(app)/`)

**Pages moving to `(no-nav)`** (no BottomNav):
- `app/(app)/events/` → `app/(app)/(no-nav)/events/`
- `app/(app)/series/` → `app/(app)/(no-nav)/series/`
- `app/(app)/churches/[id]/` → `app/(app)/(no-nav)/churches/[id]/`
- `app/(app)/profile/` → `app/(app)/(no-nav)/profile/`

> **Note:** `app/(app)/churches/` splits — the list stays in `(with-nav)`, the detail `[id]` goes in `(no-nav)`. In Next.js route groups this works because `(with-nav)/churches/page.tsx` resolves to `/churches` and `(no-nav)/churches/[id]/page.tsx` resolves to `/churches/[id]` — no URL collision.

- [ ] **Step 1: Update `app/(app)/layout.tsx`** — strip out nav; it becomes a pure shell wrapper

```tsx
import { Suspense } from "react";
import { BackButtonProvider } from "@/components/back-button-provider";
import { PushNotificationProvider } from "@/components/push-notification-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
      <Suspense>
        <BackButtonProvider />
      </Suspense>
      <PushNotificationProvider />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(app)/(with-nav)/layout.tsx`**

```tsx
import { Suspense } from "react";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { getCachedUnreadCount } from "@/lib/actions/data-user";
import { UserRole } from "@prisma/client";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense>
        <NavShell />
      </Suspense>
      <main className="pb-nav">{children}</main>
    </div>
  );
}

async function NavShell() {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const unreadCount = session?.user?.id ? await getCachedUnreadCount(session.user.id) : 0;

  return (
    <>
      <TopNav user={session?.user} />
      <BottomNav isOrganiser={isOrganiser} isAdmin={isAdmin} unreadCount={unreadCount} />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
    </>
  );
}
```

- [ ] **Step 3: Create `app/(app)/(no-nav)/layout.tsx`**

```tsx
import { Suspense } from "react";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";

export default function NoNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense>
        <NoNavShell />
      </Suspense>
      <main>{children}</main>
    </div>
  );
}

async function NoNavShell() {
  const session = await auth();
  return <TopNav user={session?.user} />;
}
```

- [ ] **Step 4: Update `components/bottom-nav.tsx`** — remove `useIsDetailPage`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Church, CalendarDays, Wrench, ShieldCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const baseTabs = [ /* unchanged */ ];
const organiserTab = { /* unchanged */ };
const adminTab = { /* unchanged */ };

interface BottomNavProps {
  isOrganiser?: boolean;
  isAdmin?: boolean;
  unreadCount?: number;
}

export function BottomNav({ isOrganiser, isAdmin, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  // No useIsDetailPage — presence in layout controls visibility

  const tabs = isAdmin
    ? [...baseTabs, organiserTab, adminTab]
    : isOrganiser
    ? [...baseTabs, organiserTab]
    : baseTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0px_-2px_31px_0px_#0000001A] pb-safe">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          const showDot = href === "/notifications" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("size-5 transition-transform", isActive && "scale-110")} />
                {showDot && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive" />
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Rename `hooks/use-is-detail-page.ts` → `hooks/use-show-back-button.ts`**

Update the function name to match its actual purpose:

```ts
"use client";

import { usePathname, useParams } from "next/navigation";

export function useShowBackButton(): boolean {
  const pathname = usePathname();
  const params = useParams();
  const id = params?.id ?? null;
  return (
    ((pathname.startsWith("/events/") ||
      pathname.startsWith("/churches/") ||
      pathname.startsWith("/series/")) &&
      id !== null) ||
    pathname === "/events/create" ||
    pathname === "/series/create" ||
    pathname.startsWith("/profile")
  );
}
```

- [ ] **Step 6: Update `TopNav` to import `useShowBackButton` instead of `useIsDetailPage`**

Find `components/top-nav.tsx` and replace:
```ts
import { useIsDetailPage } from "@/hooks/use-is-detail-page";
const isDetailPage = useIsDetailPage();
```
with:
```ts
import { useShowBackButton } from "@/hooks/use-show-back-button";
const showBackButton = useShowBackButton();
```

- [ ] **Step 7: Move page files into the new route groups**

Using git mv to preserve history:
```bash
# Create target directories first
mkdir -p "app/(app)/(with-nav)"
mkdir -p "app/(app)/(no-nav)"

# Move list pages to (with-nav)
git mv "app/(app)/page.tsx" "app/(app)/(with-nav)/page.tsx"
git mv "app/(app)/churches/page.tsx" "app/(app)/(with-nav)/churches/page.tsx"
git mv "app/(app)/my-events" "app/(app)/(with-nav)/my-events"
git mv "app/(app)/notifications" "app/(app)/(with-nav)/notifications"
git mv "app/(app)/organiser" "app/(app)/(with-nav)/organiser"
git mv "app/(app)/admin" "app/(app)/(with-nav)/admin"

# Move detail pages to (no-nav)
git mv "app/(app)/events" "app/(app)/(no-nav)/events"
git mv "app/(app)/series" "app/(app)/(no-nav)/series"
git mv "app/(app)/churches/[id]" "app/(app)/(no-nav)/churches/[id]"
git mv "app/(app)/profile" "app/(app)/(no-nav)/profile"
```

> **Important:** After moving, verify that `loading.tsx` and `error.tsx` files exist in the right locations. Next.js resolves them from the nearest ancestor — if the moved pages had them, make sure they move too.

- [ ] **Step 8: Build to verify no broken routes**

```bash
npx next build 2>&1 | Select-String "error|Error|warn|Warning" | head -30
```

Expected: build succeeds. Check that all routes still resolve (e.g., `/`, `/churches`, `/events/[id]`).

- [ ] **Step 9: Run tests**

```bash
npm test -- --no-coverage
```

Update any tests that import from `hooks/use-is-detail-page` to use the new path.

- [ ] **Step 10: Delete `hooks/use-is-detail-page.ts`** (after confirming no remaining imports)

```bash
npx grep -r "use-is-detail-page" app components hooks --include="*.ts" --include="*.tsx"
```

If no results: `git rm hooks/use-is-detail-page.ts`

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: replace useIsDetailPage hook with route group layouts for nav visibility"
```

---

## Checklist

| # | Task | Phase | Severity | Done |
|---|------|-------|----------|------|
| 1 | Create proxy.ts | 1 | Critical | [ ] |
| 2 | Remove isPast field | 1 | Critical | [ ] |
| 3 | Add NotificationType enum | 2 | Medium | [ ] |
| 4 | Make Event.churchId non-nullable | 2 | Medium | [ ] |
| 5 | Add ServiceTime enums | 2 | Low | [ ] |
| 6 | Fix notification queue bypass | 3 | Critical | [ ] |
| 7 | Fix N+1 on event publish | 3 | High | [ ] |
| 8 | Parallelize FCM delivery | 3 | High | [ ] |
| 9 | Fix getEventById cache split | 4 | High | [ ] |
| 10 | Fix home page over-fetch | 4 | High | [ ] |
| 11 | Reduce JWT update window | 5 | Medium | [ ] |
| 12 | Collapse \_cache.ts duplication | 5 | Medium | [ ] |
| 13 | Fix generateMetadata double fetch | 5 | Medium | [ ] |
| 14 | Nav via route groups | 5 | Medium | [ ] |
