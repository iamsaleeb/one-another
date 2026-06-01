# Approval Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to request a helper role on events, series, and churches via a "Help out" flow, with approvers able to approve or deny from the detail page and via notifications.

**Architecture:** Single polymorphic `ApprovalRequest` DB model with `resourceType`/`resourceId`. A new `domains/approvals/` domain follows the existing domain-driven pattern. A `resolvers.ts` config object maps each resource type to its requestable role and grant function, making future resource types a one-line addition. UI components live in `domains/approvals/components/` and are imported by the three detail pages.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), shadcn/ui (DropdownMenu, Drawer, Card, Avatar, Badge, Button, Textarea), React Hook Form + zod, Jest

---

## File Map

**Create:**
- `domains/approvals/lib/types.ts` — `ApprovalActionState` type
- `domains/approvals/lib/resolvers.ts` — `APPROVAL_CONFIG` mapping (server-only)
- `domains/approvals/validations/requests.ts` — `SubmitRequestSchema`, `ReviewRequestSchema`
- `domains/approvals/validations/__tests__/requests.test.ts`
- `domains/approvals/dal/requests.ts` — raw DB queries (server-only)
- `domains/approvals/dal/__tests__/requests.test.ts`
- `domains/approvals/actions/data.ts` — server-side data fetching with `"use cache: remote"`
- `domains/approvals/actions/requests.ts` — `submitRequestAction`, `reviewRequestAction` (server actions)
- `domains/approvals/actions/__tests__/requests.test.ts`
- `domains/approvals/components/approval-menu-trigger.tsx` — 3-dot DropdownMenu client component
- `domains/approvals/components/request-access-drawer.tsx` — Drawer + RHF form client component
- `domains/approvals/components/pending-requests-card.tsx` — approver card client component
- `domains/approvals/index.ts` — barrel exports

**Modify:**
- `prisma/schema.prisma` — add `ResourceType`, `ApprovalStatus` enums, `ApprovalRequest` model, two new `NotificationType` values, User relations
- `domains/notifications/types.ts` — register two new notification types in `NOTIFICATION_TYPES`
- `app/(app)/(no-nav)/events/[id]/page.tsx` — fetch request state, render `ApprovalMenuTrigger` + `PendingRequestsCard`
- `app/(app)/(no-nav)/series/[id]/page.tsx` — same
- `app/(app)/(no-nav)/churches/[id]/page.tsx` — add `can()` checks, fetch request state, render components

---

## Task 1: Prisma Schema — Enums, Model, User Relations, NotificationType

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ResourceType` and `ApprovalStatus` enums**

In `prisma/schema.prisma`, add these enums (place after the existing `SeriesRole` enum):

```prisma
enum ResourceType {
  EVENT
  SERIES
  CHURCH
}

enum ApprovalStatus {
  PENDING
  APPROVED
  DENIED
}
```

- [ ] **Step 2: Add `ApprovalRequest` model**

Add this model after `SeriesStaffAssignment`:

```prisma
model ApprovalRequest {
  id            String         @id @default(cuid())
  requesterId   String
  resourceType  ResourceType
  resourceId    String
  requestedRole String
  message       String?
  status        ApprovalStatus @default(PENDING)
  reviewedBy    String?
  reviewedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  requester     User           @relation("ApprovalRequests", fields: [requesterId], references: [id], onDelete: Cascade)
  reviewer      User?          @relation("ApprovalReviews", fields: [reviewedBy], references: [id])

  @@unique([requesterId, resourceType, resourceId])
  @@index([resourceType, resourceId, status])
  @@index([requesterId])
  @@map("approval_requests")
}
```

- [ ] **Step 3: Add User back-relations**

In the `User` model, add after the `eventStaff` field:

```prisma
  approvalRequests      ApprovalRequest[]      @relation("ApprovalRequests")
  approvalReviews       ApprovalRequest[]      @relation("ApprovalReviews")
```

- [ ] **Step 4: Add two new NotificationType values**

In the `NotificationType` enum, add:

```prisma
enum NotificationType {
  EVENT_REMINDER
  NEW_SERIES_SESSION
  EVENT_CANCELLED
  ROLE_REQUEST_RECEIVED
  ROLE_REQUEST_OUTCOME
}
```

- [ ] **Step 5: Verify schema parses**

```bash
npx prisma validate
```

Expected: no errors.

---

## Task 2: Run Migration

**Files:** (none — migration artifact only)

- [ ] **Step 1: Generate and apply migration**

```bash
npx prisma migrate dev --name add_approval_workflows
```

Expected output includes: `Your database is now in sync with your schema.`

- [ ] **Step 2: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: client generated with new types `ResourceType`, `ApprovalStatus`, `ApprovalRequest`, and updated `NotificationType`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add approval_requests table and notification types"
```

---

## Task 3: Register New Notification Types

**Files:**
- Modify: `domains/notifications/types.ts`

- [ ] **Step 1: Add entries to NOTIFICATION_TYPES**

In `domains/notifications/types.ts`, extend the `NOTIFICATION_TYPES` record. Add after `EVENT_CANCELLED`:

```ts
  [NotificationType.ROLE_REQUEST_RECEIVED]: {
    label: "Help Requests",
    description: "Get notified when someone requests to help with your event, series, or church",
    defaultEnabled: true,
  },
  [NotificationType.ROLE_REQUEST_OUTCOME]: {
    label: "Help Request Outcomes",
    description: "Get notified when your request to help has been approved or denied",
    defaultEnabled: true,
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (the exhaustive `Record<NotificationType, ...>` now includes all values).

- [ ] **Step 3: Commit**

```bash
git add domains/notifications/types.ts
git commit -m "feat(notifications): register ROLE_REQUEST_RECEIVED and ROLE_REQUEST_OUTCOME types"
```

---

## Task 4: Domain Lib — types.ts and resolvers.ts

**Files:**
- Create: `domains/approvals/lib/types.ts`
- Create: `domains/approvals/lib/resolvers.ts`

- [ ] **Step 1: Create types.ts**

```ts
// domains/approvals/lib/types.ts
export interface ApprovalActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}
```

- [ ] **Step 2: Create resolvers.ts**

```ts
// domains/approvals/lib/resolvers.ts
import "server-only";
import type { ChurchRole, EventRole, ResourceType, SeriesRole } from "@prisma/client";
import { Capabilities, type Capability } from "@/domains/roles/lib/capabilities";
import { upsertEventStaff } from "@/domains/roles/dal/event-staff";
import { upsertSeriesStaff } from "@/domains/roles/dal/series-staff";
import { upsertChurchMembership } from "@/domains/roles/dal/church-memberships";

interface ApprovalConfig {
  role: string;
  approveCapability: Capability;
  grant: (requesterId: string, resourceId: string, reviewerId: string) => Promise<unknown>;
}

export const APPROVAL_CONFIG: Record<ResourceType, ApprovalConfig> = {
  EVENT: {
    role: "EVENT_EDITOR" as EventRole,
    approveCapability: Capabilities.EVENT_MANAGE_STAFF,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertEventStaff(requesterId, resourceId, "EVENT_EDITOR", reviewerId),
  },
  SERIES: {
    role: "SERIES_SESSION_CREATOR" as SeriesRole,
    approveCapability: Capabilities.SERIES_UPDATE,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertSeriesStaff(requesterId, resourceId, "SERIES_SESSION_CREATOR", reviewerId),
  },
  CHURCH: {
    role: "EVENT_CREATOR" as ChurchRole,
    approveCapability: Capabilities.CHURCH_MANAGE_MEMBERS,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertChurchMembership(requesterId, resourceId, "EVENT_CREATOR", reviewerId),
  },
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add domains/approvals/lib/
git commit -m "feat(approvals): add domain lib types and resolvers"
```

---

## Task 5: Validations

**Files:**
- Create: `domains/approvals/validations/requests.ts`
- Create: `domains/approvals/validations/__tests__/requests.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// domains/approvals/validations/__tests__/requests.test.ts
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
} from "../requests";

describe("SubmitRequestSchema", () => {
  it("accepts valid EVENT request with message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "evt-1",
      message: "I can help with AV",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request without message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "SERIES",
      resourceId: "ser-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown resourceType", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "UNKNOWN",
      resourceId: "r-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 280 chars", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "r-1",
      message: "a".repeat(281),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty resourceId", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("ReviewRequestSchema", () => {
  it("accepts APPROVED decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "req-1",
      decision: "APPROVED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DENIED decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "req-1",
      decision: "DENIED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "req-1",
      decision: "MAYBE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing requestId", () => {
    const result = ReviewRequestSchema.safeParse({ decision: "APPROVED" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest domains/approvals/validations/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../requests'`

- [ ] **Step 3: Create validations/requests.ts**

```ts
// domains/approvals/validations/requests.ts
import { z } from "zod";
import { ResourceType } from "@prisma/client";

export const SubmitRequestSchema = z.object({
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string().min(1),
  message: z.string().max(280).optional(),
});

export const ReviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "DENIED"]),
});

export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest domains/approvals/validations/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add domains/approvals/validations/
git commit -m "feat(approvals): add request validations"
```

---

## Task 6: DAL

**Files:**
- Create: `domains/approvals/dal/requests.ts`
- Create: `domains/approvals/dal/__tests__/requests.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// domains/approvals/dal/__tests__/requests.test.ts
jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    event: { findUnique: jest.fn() },
    series: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn(), findMany: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn(), findMany: jest.fn() },
    churchMembership: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));

import {
  upsertApprovalRequest,
  getMyRequestForResource,
  getPendingRequestsForResource,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
} from "../requests";
import { prisma } from "@/lib/db";

const mockApprovalRequest = prisma.approvalRequest as jest.Mocked<typeof prisma.approvalRequest>;
const mockEvent = prisma.event as jest.Mocked<typeof prisma.event>;
const mockSeries = prisma.series as jest.Mocked<typeof prisma.series>;
const mockEventStaff = prisma.eventStaffAssignment as jest.Mocked<typeof prisma.eventStaffAssignment>;
const mockChurchMembership = prisma.churchMembership as jest.Mocked<typeof prisma.churchMembership>;

beforeEach(() => jest.clearAllMocks());

describe("upsertApprovalRequest", () => {
  it("upserts on composite unique", async () => {
    mockApprovalRequest.upsert.mockResolvedValue({} as never);
    await upsertApprovalRequest({
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "Hi",
    });
    expect(mockApprovalRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          requesterId_resourceType_resourceId: {
            requesterId: "u1",
            resourceType: "EVENT",
            resourceId: "e1",
          },
        },
      })
    );
  });
});

describe("getMyRequestForResource", () => {
  it("queries by composite unique", async () => {
    mockApprovalRequest.findUnique.mockResolvedValue(null);
    await getMyRequestForResource("u1", "EVENT", "e1");
    expect(mockApprovalRequest.findUnique).toHaveBeenCalledWith({
      where: {
        requesterId_resourceType_resourceId: {
          requesterId: "u1",
          resourceType: "EVENT",
          resourceId: "e1",
        },
      },
    });
  });
});

describe("getPendingRequestsForResource", () => {
  it("filters by PENDING status", async () => {
    mockApprovalRequest.findMany.mockResolvedValue([]);
    await getPendingRequestsForResource("EVENT", "e1");
    expect(mockApprovalRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceType: "EVENT", resourceId: "e1", status: "PENDING" },
      })
    );
  });
});

describe("getApproverIdsForResource", () => {
  it("returns deduped ids for EVENT type", async () => {
    mockEvent.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    mockEventStaff.findMany.mockResolvedValue([{ userId: "mgr1" }] as never);
    mockChurchMembership.findMany.mockResolvedValue([{ userId: "mgr1" }, { userId: "admin1" }] as never);
    const ids = await getApproverIdsForResource("EVENT", "e1");
    expect(ids).toEqual(expect.arrayContaining(["mgr1", "admin1"]));
    expect(ids.length).toBe(2);
  });

  it("returns empty array when event not found", async () => {
    mockEvent.findUnique.mockResolvedValue(null);
    const ids = await getApproverIdsForResource("EVENT", "missing");
    expect(ids).toEqual([]);
  });
});

describe("resolveApprovalAuthContext", () => {
  it("returns eventId + churchId for EVENT", async () => {
    mockEvent.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    const ctx = await resolveApprovalAuthContext("EVENT", "e1");
    expect(ctx).toEqual({ eventId: "e1", churchId: "ch1" });
  });

  it("returns churchId only for CHURCH", async () => {
    const ctx = await resolveApprovalAuthContext("CHURCH", "ch1");
    expect(ctx).toEqual({ churchId: "ch1" });
  });
});

describe("hasDirectRoleForResource", () => {
  it("returns true when EventStaffAssignment exists", async () => {
    mockEventStaff.findUnique.mockResolvedValue({ role: "EVENT_EDITOR" } as never);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(true);
  });

  it("returns false when no assignment", async () => {
    mockEventStaff.findUnique.mockResolvedValue(null);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest domains/approvals/dal/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../requests'`

- [ ] **Step 3: Create dal/requests.ts**

```ts
// domains/approvals/dal/requests.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { ApprovalStatus, ResourceType } from "@prisma/client";

export function upsertApprovalRequest(data: {
  requesterId: string;
  resourceType: ResourceType;
  resourceId: string;
  requestedRole: string;
  message?: string;
}) {
  return prisma.approvalRequest.upsert({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId: data.requesterId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    },
    update: {
      status: "PENDING",
      message: data.message ?? null,
      reviewedBy: null,
      reviewedAt: null,
    },
    create: {
      requesterId: data.requesterId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      requestedRole: data.requestedRole,
      message: data.message,
    },
  });
}

export function updateApprovalRequest(
  requestId: string,
  data: { status: ApprovalStatus; reviewedBy: string; reviewedAt: Date }
) {
  return prisma.approvalRequest.update({
    where: { id: requestId },
    data,
  });
}

export function getApprovalRequestById(id: string) {
  return prisma.approvalRequest.findUnique({
    where: { id },
    include: { requester: { select: { id: true, name: true } } },
  });
}

export function getMyRequestForResource(
  requesterId: string,
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.approvalRequest.findUnique({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId,
        resourceType,
        resourceId,
      },
    },
  });
}

export function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.approvalRequest.findMany({
    where: { resourceType, resourceId, status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getApproverIdsForResource(
  resourceType: ResourceType,
  resourceId: string
): Promise<string[]> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!event) return [];
    const [eventManagers, churchManagers] = await Promise.all([
      prisma.eventStaffAssignment.findMany({
        where: { eventId: resourceId, role: "EVENT_MANAGER" },
        select: { userId: true },
      }),
      prisma.churchMembership.findMany({
        where: { churchId: event.churchId, role: { in: ["CHURCH_ADMIN", "EVENT_MANAGER"] } },
        select: { userId: true },
      }),
    ]);
    return [
      ...new Set([
        ...eventManagers.map((m) => m.userId),
        ...churchManagers.map((m) => m.userId),
      ]),
    ];
  }

  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!series) return [];
    const [seriesManagers, churchManagers] = await Promise.all([
      prisma.seriesStaffAssignment.findMany({
        where: { seriesId: resourceId, role: "SERIES_MANAGER" },
        select: { userId: true },
      }),
      prisma.churchMembership.findMany({
        where: { churchId: series.churchId, role: { in: ["CHURCH_ADMIN", "EVENT_MANAGER"] } },
        select: { userId: true },
      }),
    ]);
    return [
      ...new Set([
        ...seriesManagers.map((m) => m.userId),
        ...churchManagers.map((m) => m.userId),
      ]),
    ];
  }

  // CHURCH
  const admins = await prisma.churchMembership.findMany({
    where: { churchId: resourceId, role: "CHURCH_ADMIN" },
    select: { userId: true },
  });
  return admins.map((a) => a.userId);
}

export async function resolveApprovalAuthContext(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ churchId?: string; eventId?: string; seriesId?: string }> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return { eventId: resourceId, churchId: event?.churchId };
  }
  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return { seriesId: resourceId, churchId: series?.churchId };
  }
  return { churchId: resourceId };
}

export async function hasDirectRoleForResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  if (resourceType === "EVENT") {
    const row = await prisma.eventStaffAssignment.findUnique({
      where: { userId_eventId: { userId, eventId: resourceId } },
    });
    return row !== null;
  }
  if (resourceType === "SERIES") {
    const row = await prisma.seriesStaffAssignment.findUnique({
      where: { userId_seriesId: { userId, seriesId: resourceId } },
    });
    return row !== null;
  }
  const row = await prisma.churchMembership.findUnique({
    where: { userId_churchId: { userId, churchId: resourceId } },
  });
  return row !== null;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest domains/approvals/dal/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add domains/approvals/dal/
git commit -m "feat(approvals): add DAL for approval requests"
```

---

## Task 7: Data Actions

**Files:**
- Create: `domains/approvals/actions/data.ts`

No tests for this file (thin wrapper over DAL with caching directives — same pattern as `domains/events/actions/data.ts`).

- [ ] **Step 1: Create actions/data.ts**

```ts
// domains/approvals/actions/data.ts
"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import type { ResourceType } from "@prisma/client";
import {
  getMyRequestForResource as dalGetMyRequest,
  getPendingRequestsForResource as dalGetPending,
} from "../dal/requests";

export async function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  cacheTag(`approval-${resourceType}-${resourceId}-${userId}`);
  cacheLife("minutes");
  return dalGetMyRequest(userId, resourceType, resourceId);
}

export async function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-pending-${resourceType}-${resourceId}`);
  cacheLife("minutes");
  return dalGetPending(resourceType, resourceId);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/actions/data.ts
git commit -m "feat(approvals): add cached data fetching actions"
```

---

## Task 8: Server Actions

**Files:**
- Create: `domains/approvals/actions/requests.ts`
- Create: `domains/approvals/actions/__tests__/requests.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// domains/approvals/actions/__tests__/requests.test.ts
jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/domains/roles/lib/session", () => ({ getActor: jest.fn() }));
jest.mock("@/domains/roles/lib/can", () => ({ can: jest.fn() }));
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  updateApprovalRequest: jest.fn(),
  getApprovalRequestById: jest.fn(),
  getApproverIdsForResource: jest.fn(),
  resolveApprovalAuthContext: jest.fn(),
  hasDirectRoleForResource: jest.fn(),
}));
jest.mock("@/domains/approvals/lib/resolvers", () => ({
  APPROVAL_CONFIG: {
    EVENT: {
      role: "EVENT_EDITOR",
      approveCapability: "event:manage_staff",
      grant: jest.fn(),
    },
    SERIES: {
      role: "SERIES_SESSION_CREATOR",
      approveCapability: "series:update",
      grant: jest.fn(),
    },
    CHURCH: {
      role: "EVENT_CREATOR",
      approveCapability: "church:manage_members",
      grant: jest.fn(),
    },
  },
}));
jest.mock("@/domains/notifications/queue", () => ({
  queueNotification: jest.fn(),
}));

import { submitRequestAction, reviewRequestAction } from "../requests";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import * as dal from "@/domains/approvals/dal/requests";
import { APPROVAL_CONFIG } from "@/domains/approvals/lib/resolvers";
import { queueNotification } from "@/domains/notifications/queue";

const mockGetActor = getActor as jest.Mock;
const mockCan = can as jest.Mock;
const mockDal = dal as jest.Mocked<typeof dal>;
const mockQueue = queueNotification as jest.Mock;
const mockGrant = (APPROVAL_CONFIG.EVENT.grant as jest.Mock);

const actor = { id: "user-1", isPlatformAdmin: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(actor);
  mockCan.mockResolvedValue(true);
  mockDal.hasDirectRoleForResource.mockResolvedValue(false);
  mockDal.getApproverIdsForResource.mockResolvedValue(["approver-1"]);
  mockDal.upsertApprovalRequest.mockResolvedValue({} as never);
  mockDal.resolveApprovalAuthContext.mockResolvedValue({ eventId: "e1", churchId: "ch1" });
});

describe("submitRequestAction", () => {
  const validInput = { resourceType: "EVENT", resourceId: "e1" };

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await submitRequestAction(validInput);
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await submitRequestAction({ resourceType: "BAD", resourceId: "" });
    expect(result).toHaveProperty("fieldErrors");
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when user already has direct role", async () => {
    mockDal.hasDirectRoleForResource.mockResolvedValue(true);
    const result = await submitRequestAction(validInput);
    expect(result).toEqual({ error: "You already have access." });
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("upserts request and fans out notifications on success", async () => {
    const result = await submitRequestAction({ ...validInput, message: "I can help" });
    expect(result).toEqual({ success: "Request submitted." });
    expect(mockDal.upsertApprovalRequest).toHaveBeenCalledWith({
      requesterId: "user-1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "I can help",
    });
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "approver-1", type: "ROLE_REQUEST_RECEIVED" })
    );
  });
});

describe("reviewRequestAction", () => {
  const pendingRequest = {
    id: "req-1",
    requesterId: "requester-1",
    resourceType: "EVENT" as const,
    resourceId: "e1",
    status: "PENDING" as const,
    requestedRole: "EVENT_EDITOR",
    requester: { id: "requester-1", name: "Alice" },
  };

  beforeEach(() => {
    mockDal.getApprovalRequestById.mockResolvedValue(pendingRequest as never);
    mockDal.updateApprovalRequest.mockResolvedValue({} as never);
    mockGrant.mockResolvedValue({});
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await reviewRequestAction({ requestId: "missing", decision: "APPROVED" });
    expect(result).toEqual({ error: "Request not found." });
  });

  it("returns error when already reviewed", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({ ...pendingRequest, status: "APPROVED" } as never);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "DENIED" });
    expect(result).toEqual({ error: "Request already reviewed." });
  });

  it("returns error when not authorized to approve", async () => {
    mockCan.mockResolvedValue(false);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.updateApprovalRequest).not.toHaveBeenCalled();
  });

  it("approves request and grants role", async () => {
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ success: "Request approved." });
    expect(mockDal.updateApprovalRequest).toHaveBeenCalledWith("req-1", {
      status: "APPROVED",
      reviewedBy: "user-1",
      reviewedAt: expect.any(Date),
    });
    expect(mockGrant).toHaveBeenCalledWith("requester-1", "e1", "user-1");
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "requester-1", type: "ROLE_REQUEST_OUTCOME" })
    );
  });

  it("denies request without granting role", async () => {
    const result = await reviewRequestAction({ requestId: "req-1", decision: "DENIED" });
    expect(result).toEqual({ success: "Request denied." });
    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "requester-1", type: "ROLE_REQUEST_OUTCOME" })
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../requests'`

- [ ] **Step 3: Create actions/requests.ts**

```ts
// domains/approvals/actions/requests.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { NotificationType, type ResourceType } from "@prisma/client";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { SubmitRequestSchema, ReviewRequestSchema } from "../validations/requests";
import {
  upsertApprovalRequest,
  updateApprovalRequest,
  getApprovalRequestById,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
} from "../dal/requests";
import { APPROVAL_CONFIG } from "../lib/resolvers";
import { queueNotification } from "@/domains/notifications/queue";
import type { ApprovalActionState } from "../lib/types";

function resourcePath(resourceType: ResourceType, resourceId: string): string {
  const paths: Record<ResourceType, string> = {
    EVENT: `/events/${resourceId}`,
    SERIES: `/series/${resourceId}`,
    CHURCH: `/churches/${resourceId}`,
  };
  return paths[resourceType];
}

export async function submitRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = SubmitRequestSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { resourceType, resourceId, message } = parsed.data;
  const config = APPROVAL_CONFIG[resourceType];

  const alreadyHasAccess = await hasDirectRoleForResource(actor.id, resourceType, resourceId);
  if (alreadyHasAccess) return { error: "You already have access." };

  await upsertApprovalRequest({
    requesterId: actor.id,
    resourceType,
    resourceId,
    requestedRole: config.role,
    message,
  });

  const approverIds = await getApproverIdsForResource(resourceType, resourceId);
  await Promise.all(
    approverIds.map((userId) =>
      queueNotification({
        userId,
        type: NotificationType.ROLE_REQUEST_RECEIVED,
        title: "New help request",
        body: `Someone wants to help with this ${resourceType.toLowerCase()}.`,
        data: { requesterId: actor.id, resourceType, resourceId },
      })
    )
  );

  revalidateTag(`approval-${resourceType}-${resourceId}-${actor.id}`);
  revalidateTag(`approval-pending-${resourceType}-${resourceId}`);
  revalidatePath(resourcePath(resourceType, resourceId));
  return { success: "Request submitted." };
}

export async function reviewRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { requestId, decision } = parsed.data;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "Request already reviewed." };

  const authContext = await resolveApprovalAuthContext(request.resourceType, request.resourceId);
  const config = APPROVAL_CONFIG[request.resourceType];
  const allowed = await can(actor, config.approveCapability, authContext);
  if (!allowed) return { error: "Unauthorised." };

  await updateApprovalRequest(requestId, {
    status: decision,
    reviewedBy: actor.id,
    reviewedAt: new Date(),
  });

  if (decision === "APPROVED") {
    await config.grant(request.requesterId, request.resourceId, actor.id);
  }

  await queueNotification({
    userId: request.requesterId,
    type: NotificationType.ROLE_REQUEST_OUTCOME,
    title: decision === "APPROVED" ? "Access approved" : "Access denied",
    body:
      decision === "APPROVED"
        ? "Your request to help has been approved."
        : "Your request to help has been denied.",
    data: {
      requestId,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      decision,
    },
  });

  revalidateTag(`approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`);
  revalidateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  revalidatePath(resourcePath(request.resourceType, request.resourceId));
  return { success: decision === "APPROVED" ? "Request approved." : "Request denied." };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add domains/approvals/actions/
git commit -m "feat(approvals): add submitRequestAction and reviewRequestAction"
```

---

## Task 9: ApprovalMenuTrigger Component

**Files:**
- Create: `domains/approvals/components/approval-menu-trigger.tsx`

No unit test — client interaction component, covered by page-level manual testing.

- [ ] **Step 1: Create the component**

```tsx
// domains/approvals/components/approval-menu-trigger.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@prisma/client";
import { RequestAccessDrawer } from "./request-access-drawer";

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  requestStatus: "PENDING" | "APPROVED" | "DENIED" | null;
  hasRole: boolean;
}

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  requestStatus,
  hasRole,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showHelpOut = isAuthenticated && !hasRole && requestStatus === null;
  const showPending = requestStatus === "PENDING";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label="More options">
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              Help out
            </DropdownMenuItem>
          )}
          {showPending && (
            <DropdownMenuItem disabled>
              Request pending…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestAccessDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (RequestAccessDrawer import will resolve after Task 10 — if it errors now, stub it first then revisit).

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/components/approval-menu-trigger.tsx
git commit -m "feat(approvals): add ApprovalMenuTrigger component"
```

---

## Task 10: RequestAccessDrawer Component

**Files:**
- Create: `domains/approvals/components/request-access-drawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// domains/approvals/components/request-access-drawer.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitRequestAction } from "../actions/requests";

const FormSchema = z.object({
  message: z.string().max(280).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export function RequestAccessDrawer({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { message: "" },
  });

  async function onSubmit(values: FormValues) {
    const result = await submitRequestAction({
      resourceType,
      resourceId,
      message: values.message || undefined,
    });
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    form.reset();
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Help out</DrawerTitle>
          <DrawerDescription>
            You&apos;ll be added as a helper for{" "}
            <span className="font-medium">{resourceName}</span>.
          </DrawerDescription>
        </DrawerHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add an optional message… (max 280 chars)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-destructive mt-2 text-sm">
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>

        <DrawerFooter>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Sending…" : "Send request"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/components/request-access-drawer.tsx
git commit -m "feat(approvals): add RequestAccessDrawer component"
```

---

## Task 11: PendingRequestsCard Component

**Files:**
- Create: `domains/approvals/components/pending-requests-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
// domains/approvals/components/pending-requests-card.tsx
"use client";

import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceType } from "@prisma/client";
import { reviewRequestAction } from "../actions/requests";

interface PendingRequest {
  id: string;
  message: string | null;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  requests: PendingRequest[];
  resourceType: ResourceType;
  resourceId: string;
}

export function PendingRequestsCard({ requests, resourceType, resourceId }: Props) {
  if (requests.length === 0) return null;

  return (
    <Card className="shadow-card rounded-2xl border-0 bg-white">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <CardTitle className="text-base font-semibold">Help requests</CardTitle>
        <Badge variant="secondary">{requests.length}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {requests.map((req) => (
          <RequestRow key={req.id} request={req} resourceType={resourceType} resourceId={resourceId} />
        ))}
      </CardContent>
    </Card>
  );
}

function RequestRow({
  request,
  resourceType,
  resourceId,
}: {
  request: PendingRequest;
  resourceType: ResourceType;
  resourceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";

  function handleReview(decision: "APPROVED" | "DENIED") {
    startTransition(() =>
      reviewRequestAction({ requestId: request.id, decision }).then(() => {})
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-9 shrink-0">
        {request.requester.image && (
          <AvatarImage src={request.requester.image} alt={request.requester.name ?? ""} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-sm font-medium leading-none">{request.requester.name ?? "Unknown"}</p>
        {request.message && (
          <p className="text-muted-foreground text-sm">{request.message}</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleReview("APPROVED")}
            disabled={isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReview("DENIED")}
            disabled={isPending}
          >
            Deny
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/components/pending-requests-card.tsx
git commit -m "feat(approvals): add PendingRequestsCard component"
```

---

## Task 12: Domain Barrel

**Files:**
- Create: `domains/approvals/index.ts`

- [ ] **Step 1: Create index.ts**

```ts
// domains/approvals/index.ts

// Server actions — importable from client components
export { submitRequestAction, reviewRequestAction } from "./actions/requests";

// Data fetching — server-only, for use in server components/pages
export { getMyRequestForResource, getPendingRequestsForResource } from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";
export { PendingRequestsCard } from "./components/pending-requests-card";

// Types
export type { ApprovalActionState } from "./lib/types";
```

- [ ] **Step 2: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all existing + new tests pass.

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/index.ts
git commit -m "feat(approvals): add domain barrel"
```

---

## Task 13: Event Detail Page Integration

**Files:**
- Modify: `app/(app)/(no-nav)/events/[id]/page.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add after the existing role/capabilities imports:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
  PendingRequestsCard,
} from "@/domains/approvals";
```

- [ ] **Step 2: Fetch approval state**

Inside `EventDetailPage`, after the `[canEdit, canDelete, canViewAttendees]` block, add:

```ts
  const canManageStaff = actor
    ? await can(actor, Capabilities.EVENT_MANAGE_STAFF, { churchId, eventId: id })
    : false;

  const [myRequest, pendingRequests] = await Promise.all([
    session?.user?.id
      ? getMyRequestForResource("EVENT", id, session.user.id)
      : Promise.resolve(null),
    canManageStaff
      ? getPendingRequestsForResource("EVENT", id)
      : Promise.resolve([]),
  ]);
```

- [ ] **Step 3: Replace the Share2 button with ApprovalMenuTrigger**

Find this block in the JSX:

```tsx
        <button
          type="button"
          disabled
          aria-label="Share event"
          className="p-1 opacity-50"
        >
          <Share2 className="text-muted-foreground size-5" />
        </button>
```

Replace with:

```tsx
        <ApprovalMenuTrigger
          resourceType="EVENT"
          resourceId={id}
          resourceName={event.title}
          isAuthenticated={!!session?.user}
          requestStatus={myRequest?.status ?? null}
          hasRole={canEdit}
        />
```

Also remove the `Share2` import from lucide-react if it's no longer used elsewhere on the page.

- [ ] **Step 4: Render PendingRequestsCard**

Inside the content area `<div className="flex flex-col gap-4 px-4 pt-5 pb-28">`, add after the Description card block and before the CampAgenda block:

```tsx
        {canManageStaff && (
          <PendingRequestsCard
            requests={pendingRequests}
            resourceType="EVENT"
            resourceId={id}
          />
        )}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/(no-nav)/events/[id]/page.tsx"
git commit -m "feat(approvals): integrate approval flow into event detail page"
```

---

## Task 14: Series Detail Page Integration

**Files:**
- Modify: `app/(app)/(no-nav)/series/[id]/page.tsx`

- [ ] **Step 1: Add imports**

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
  PendingRequestsCard,
} from "@/domains/approvals";
```

- [ ] **Step 2: Fetch approval state**

After the `[canEdit, canDelete, canAddSession]` block, add:

```ts
  const canManageSeries = canEdit;

  const [myRequest, pendingRequests] = await Promise.all([
    session?.user?.id
      ? getMyRequestForResource("SERIES", id, session.user.id)
      : Promise.resolve(null),
    canManageSeries
      ? getPendingRequestsForResource("SERIES", id)
      : Promise.resolve([]),
  ]);
```

- [ ] **Step 3: Add ApprovalMenuTrigger to the header area**

In the series info card header flex row (where the cadence badge and edit button are), add the trigger after the edit/delete buttons:

```tsx
              <ApprovalMenuTrigger
                resourceType="SERIES"
                resourceId={series.id}
                resourceName={series.name}
                isAuthenticated={!!session?.user}
                requestStatus={myRequest?.status ?? null}
                hasRole={canAddSession}
              />
```

- [ ] **Step 4: Render PendingRequestsCard**

After the series description content, before the closing content div, add:

```tsx
        {canManageSeries && (
          <PendingRequestsCard
            requests={pendingRequests}
            resourceType="SERIES"
            resourceId={series.id}
          />
        )}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/(no-nav)/series/[id]/page.tsx"
git commit -m "feat(approvals): integrate approval flow into series detail page"
```

---

## Task 15: Church Detail Page Integration

**Files:**
- Modify: `app/(app)/(no-nav)/churches/[id]/page.tsx`

- [ ] **Step 1: Add imports**

```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
  PendingRequestsCard,
} from "@/domains/approvals";
```

- [ ] **Step 2: Resolve actor and capability checks**

After fetching `church` and `myFollow`, add:

```ts
  const actor = sessionToActor(session);

  const [canManageMembers, canCreateEvent] = actor
    ? await Promise.all([
        can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId: id }),
        can(actor, Capabilities.EVENT_CREATE, { churchId: id }),
      ])
    : [false, false];

  const [myRequest, pendingRequests] = await Promise.all([
    session?.user?.id
      ? getMyRequestForResource("CHURCH", id, session.user.id)
      : Promise.resolve(null),
    canManageMembers
      ? getPendingRequestsForResource("CHURCH", id)
      : Promise.resolve([]),
  ]);
```

- [ ] **Step 3: Replace Share2 icon with ApprovalMenuTrigger**

Find the icon buttons section. Replace the Share2 icon button:

```tsx
              <div className="border-border flex h-11 w-11 items-center justify-center rounded-full border-2">
                <Share2 className="text-foreground h-5 w-5" />
              </div>
```

With:

```tsx
              <ApprovalMenuTrigger
                resourceType="CHURCH"
                resourceId={id}
                resourceName={church.name}
                isAuthenticated={!!session?.user}
                requestStatus={myRequest?.status ?? null}
                hasRole={canCreateEvent}
              />
```

Remove unused `Share2` import from lucide-react.

- [ ] **Step 4: Render PendingRequestsCard**

After `<ChurchTabs ... />`, add:

```tsx
      {canManageMembers && (
        <div className="px-4 pt-4">
          <PendingRequestsCard
            requests={pendingRequests}
            resourceType="CHURCH"
            resourceId={id}
          />
        </div>
      )}
```

- [ ] **Step 5: Verify TypeScript compiles and all tests pass**

```bash
npx tsc --noEmit && npx jest --no-coverage
```

Expected: no type errors, all tests pass.

- [ ] **Step 6: Final commit**

```bash
git add "app/(app)/(no-nav)/churches/[id]/page.tsx"
git commit -m "feat(approvals): integrate approval flow into church detail page"
```

---

## Self-Review Checklist

- [x] Schema: `ApprovalRequest` model, `ResourceType`, `ApprovalStatus` enums, `NotificationType` additions ✓
- [x] User back-relations for both `requester` and `reviewer` ✓
- [x] `NOTIFICATION_TYPES` registry updated for both new types ✓
- [x] `resolvers.ts` covers all three resource types, each with `role`, `approveCapability`, `grant` ✓
- [x] Validations: `SubmitRequestSchema` + `ReviewRequestSchema` + tests ✓
- [x] DAL: upsert uses `requesterId_resourceType_resourceId` composite unique ✓
- [x] DAL: `getApproverIdsForResource` deduplicates across event staff + church members ✓
- [x] DAL: `resolveApprovalAuthContext` resolves `churchId` via DB lookup for EVENT/SERIES ✓
- [x] Actions: `submitRequestAction` guards auth, duplicate role, upserts, fans out notifications, revalidates ✓
- [x] Actions: `reviewRequestAction` guards auth, not-found, already-reviewed, capability, grants on APPROVED, notifies requester ✓
- [x] `revalidateTag` called with matching cache tag strings from `actions/data.ts` ✓
- [x] `ApprovalMenuTrigger`: shadcn DropdownMenu, `"use client"`, correct conditional rendering ✓
- [x] `RequestAccessDrawer`: shadcn Drawer (not Sheet), RHF + zodResolver, error display ✓
- [x] `PendingRequestsCard`: returns null when empty, Avatar + name + message + Approve/Deny buttons ✓
- [x] All three detail pages fetch `myRequest` + `pendingRequests`, pass to components ✓
- [x] Church page: adds `sessionToActor` + `can()` checks (previously missing) ✓
- [x] Type names consistent throughout: `ApprovalMenuTrigger`, `RequestAccessDrawer`, `PendingRequestsCard`, `submitRequestAction`, `reviewRequestAction` ✓
