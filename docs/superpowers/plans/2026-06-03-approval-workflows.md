# Approval Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full approval workflow system allowing users to request access to events/series/churches via a 3-dot menu, with approvers managing requests through dedicated pages and a requester status drawer.

**Architecture:** Domain module `domains/approvals/` owns the full request lifecycle. Requester flow (submit/cancel/view status) lives in a drawer on the detail page. Approver flow (list/detail/approve/deny/revoke) lives on dedicated `/helpers` and `/helpers/[requestId]` pages. On approval, the approvals domain delegates to the roles DAL to grant the appropriate RBAC role.

**Tech Stack:** Next.js 15 App Router (server components + `"use cache: remote"` + `updateTag`), Prisma ORM, React Hook Form + zodResolver, shadcn/ui (Drawer, Tabs, DropdownMenu, Avatar, Badge), date-fns, useTransition.

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ResourceType` enum, `ApprovalStatus` enum, `ApprovalRequest` model |
| `prisma/migrations/…` | New migration from `prisma migrate dev` |
| `domains/approvals/dal/requests.ts` | New — all Prisma queries |
| `domains/approvals/dal/__tests__/requests.test.ts` | New — DAL unit tests |
| `domains/approvals/validations/requests.ts` | New — Zod schemas |
| `domains/approvals/validations/__tests__/requests.test.ts` | New — validation tests |
| `domains/approvals/lib/types.ts` | New — `ApprovalActionState`, `ResolvedRequest` |
| `domains/approvals/lib/config.ts` | New — `APPROVAL_CONFIG` map |
| `domains/approvals/actions/requests.ts` | New — submit/review/cancel/revoke server actions |
| `domains/approvals/actions/__tests__/requests.test.ts` | New — action unit tests |
| `domains/approvals/actions/data.ts` | New — cached data fetchers |
| `domains/approvals/actions/__tests__/data.test.ts` | New — cached action tests |
| `domains/approvals/components/request-timeline.tsx` | New — step indicator |
| `domains/approvals/components/helper-summary-row.tsx` | New — nav list row |
| `domains/approvals/components/helpers-tabs.tsx` | New — tabbed list |
| `domains/approvals/components/request-detail-actions.tsx` | New — approve/deny/revoke buttons |
| `domains/approvals/components/request-form.tsx` | New — RHF submit form |
| `domains/approvals/components/my-request-view.tsx` | New — drawer state switcher |
| `domains/approvals/components/my-request-drawer.tsx` | New — drawer shell |
| `domains/approvals/components/approval-menu-trigger.tsx` | New — 3-dot dropdown + drawer orchestrator |
| `domains/approvals/index.ts` | New — barrel exports |
| `app/(app)/(no-nav)/events/[id]/page.tsx` | Modify — add approval data fetch + trigger |
| `app/(app)/(no-nav)/series/[id]/page.tsx` | Modify — add approval data fetch + trigger |
| `app/(app)/(no-nav)/churches/[id]/page.tsx` | Modify — add approval data fetch + trigger |
| `app/(app)/(no-nav)/events/[id]/helpers/page.tsx` | New |
| `app/(app)/(no-nav)/events/[id]/helpers/[requestId]/page.tsx` | New |
| `app/(app)/(no-nav)/series/[id]/helpers/page.tsx` | New |
| `app/(app)/(no-nav)/series/[id]/helpers/[requestId]/page.tsx` | New |
| `app/(app)/(no-nav)/churches/[id]/helpers/page.tsx` | New |
| `app/(app)/(no-nav)/churches/[id]/helpers/[requestId]/page.tsx` | New |

---

## Task 1: Database Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev`

- [ ] **Step 1: Add enums and model to schema**

Open `prisma/schema.prisma`. Add the following BEFORE the existing enum block (anywhere after the last model):

```prisma
model ApprovalRequest {
  id           String         @id @default(cuid())
  requesterId  String
  resourceType ResourceType
  resourceId   String
  status       ApprovalStatus @default(PENDING)
  message      String?
  reviewerId   String?
  createdAt    DateTime       @default(now())
  reviewedAt   DateTime?

  requester    User           @relation("ApprovalRequests", fields: [requesterId], references: [id], onDelete: Cascade)
  reviewer     User?          @relation("ApprovalReviews", fields: [reviewerId], references: [id])

  @@unique([requesterId, resourceType, resourceId])
  @@index([resourceType, resourceId, status])
  @@map("approval_requests")
}

enum ResourceType {
  EVENT
  SERIES
  CHURCH
}

enum ApprovalStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
  REVOKED
}
```

Also add the two new relations to the `User` model (inside the `model User { ... }` block, after existing relations):

```prisma
  approvalRequests ApprovalRequest[] @relation("ApprovalRequests")
  approvalReviews  ApprovalRequest[] @relation("ApprovalReviews")
```

- [ ] **Step 2: Run migration**

```
npx prisma migrate dev --name add_approval_workflows
```

Expected: migration file created, schema applied, Prisma client regenerated with `ResourceType`, `ApprovalStatus`, `ApprovalRequest`.

- [ ] **Step 3: Verify types generated**

```
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to approvals).

- [ ] **Step 4: Commit**

```
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(approvals): add ApprovalRequest schema with ResourceType and ApprovalStatus enums"
```

---

## Task 2: DAL (TDD)

**Files:**
- Create: `domains/approvals/dal/__tests__/requests.test.ts`
- Create: `domains/approvals/dal/requests.ts`

- [ ] **Step 1: Create test file**

Create `domains/approvals/dal/__tests__/requests.test.ts`:

```ts
jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import * as db from "@/lib/db";
import {
  upsertApprovalRequest,
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
  getApprovalRequestById,
  updateApprovalRequest,
  deleteApprovalRequest,
} from "../requests";

const mock = db.prisma.approvalRequest as jest.Mocked<typeof db.prisma.approvalRequest>;

beforeEach(() => jest.clearAllMocks());

describe("upsertApprovalRequest", () => {
  it("upserts with correct where/create/update", async () => {
    mock.upsert.mockResolvedValue({} as never);
    await upsertApprovalRequest({
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
      message: "hello",
    });
    expect(mock.upsert).toHaveBeenCalledWith({
      where: { requesterId_resourceType_resourceId: { requesterId: "u1", resourceType: "EVENT", resourceId: "e1" } },
      create: { requesterId: "u1", resourceType: "EVENT", resourceId: "e1", message: "hello", status: "PENDING" },
      update: { status: "PENDING", message: "hello", reviewerId: null, reviewedAt: null },
    });
  });
});

describe("getMyRequestForResource", () => {
  it("queries by requesterId + resourceType + resourceId", async () => {
    mock.findUnique.mockResolvedValue(null);
    await getMyRequestForResource("SERIES", "s1", "u1");
    expect(mock.findUnique).toHaveBeenCalledWith({
      where: { requesterId_resourceType_resourceId: { requesterId: "u1", resourceType: "SERIES", resourceId: "s1" } },
    });
  });
});

describe("getPendingRequestsForResource", () => {
  it("queries PENDING status with requester image", async () => {
    mock.findMany.mockResolvedValue([]);
    await getPendingRequestsForResource("CHURCH", "c1");
    expect(mock.findMany).toHaveBeenCalledWith({
      where: { resourceType: "CHURCH", resourceId: "c1", status: "PENDING" },
      include: { requester: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("getAllRequestsForResource", () => {
  it("queries non-PENDING with requester image and reviewer name", async () => {
    mock.findMany.mockResolvedValue([]);
    await getAllRequestsForResource("EVENT", "e1");
    expect(mock.findMany).toHaveBeenCalledWith({
      where: { resourceType: "EVENT", resourceId: "e1", status: { not: "PENDING" } },
      include: {
        requester: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getApprovalRequestById", () => {
  it("queries by id with requester image and reviewer", async () => {
    mock.findUnique.mockResolvedValue(null);
    await getApprovalRequestById("req-1");
    expect(mock.findUnique).toHaveBeenCalledWith({
      where: { id: "req-1" },
      include: {
        requester: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
  });
});

describe("updateApprovalRequest", () => {
  it("updates by id with provided data", async () => {
    mock.update.mockResolvedValue({} as never);
    await updateApprovalRequest("req-1", { status: "APPROVED", reviewerId: "u2", reviewedAt: new Date("2026-01-01") });
    expect(mock.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "APPROVED", reviewerId: "u2", reviewedAt: expect.any(Date) },
    });
  });
});

describe("deleteApprovalRequest", () => {
  it("deletes by id", async () => {
    mock.delete.mockResolvedValue({} as never);
    await deleteApprovalRequest("req-1");
    expect(mock.delete).toHaveBeenCalledWith({ where: { id: "req-1" } });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```
npx jest domains/approvals/dal/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the DAL file**

Create `domains/approvals/dal/requests.ts`:

```ts
import "server-only";
import { prisma } from "@/lib/db";
import type { ApprovalStatus, ResourceType } from "@prisma/client";

interface UpsertInput {
  requesterId: string;
  resourceType: ResourceType;
  resourceId: string;
  message?: string;
}

export function upsertApprovalRequest(input: UpsertInput) {
  const { requesterId, resourceType, resourceId, message } = input;
  return prisma.approvalRequest.upsert({
    where: { requesterId_resourceType_resourceId: { requesterId, resourceType, resourceId } },
    create: { requesterId, resourceType, resourceId, message, status: "PENDING" },
    update: { status: "PENDING", message, reviewerId: null, reviewedAt: null },
  });
}

export function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  return prisma.approvalRequest.findUnique({
    where: { requesterId_resourceType_resourceId: { requesterId: userId, resourceType, resourceId } },
  });
}

export function getPendingRequestsForResource(resourceType: ResourceType, resourceId: string) {
  return prisma.approvalRequest.findMany({
    where: { resourceType, resourceId, status: "PENDING" },
    include: { requester: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function getAllRequestsForResource(resourceType: ResourceType, resourceId: string) {
  return prisma.approvalRequest.findMany({
    where: { resourceType, resourceId, status: { not: "PENDING" } },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getApprovalRequestById(id: string) {
  return prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

export function updateApprovalRequest(
  id: string,
  data: Partial<{ status: ApprovalStatus; reviewerId: string; reviewedAt: Date }>
) {
  return prisma.approvalRequest.update({ where: { id }, data });
}

export function deleteApprovalRequest(id: string) {
  return prisma.approvalRequest.delete({ where: { id } });
}
```

- [ ] **Step 4: Run to verify it passes**

```
npx jest domains/approvals/dal/__tests__/requests.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add domains/approvals/dal/
git commit -m "feat(approvals): add approval requests DAL"
```

---

## Task 3: Validations (TDD)

**Files:**
- Create: `domains/approvals/validations/__tests__/requests.test.ts`
- Create: `domains/approvals/validations/requests.ts`

- [ ] **Step 1: Create test file**

Create `domains/approvals/validations/__tests__/requests.test.ts`:

```ts
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../requests";

describe("SubmitRequestSchema", () => {
  it("accepts valid input without message", () => {
    const result = SubmitRequestSchema.safeParse({ resourceType: "EVENT", resourceId: "e1" });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with message", () => {
    const result = SubmitRequestSchema.safeParse({ resourceType: "SERIES", resourceId: "s1", message: "I can help" });
    expect(result.success).toBe(true);
  });

  it("rejects message over 280 chars", () => {
    const result = SubmitRequestSchema.safeParse({ resourceType: "EVENT", resourceId: "e1", message: "a".repeat(281) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid resourceType", () => {
    const result = SubmitRequestSchema.safeParse({ resourceType: "INVALID", resourceId: "e1" });
    expect(result.success).toBe(false);
  });

  it("rejects empty resourceId", () => {
    const result = SubmitRequestSchema.safeParse({ resourceType: "EVENT", resourceId: "" });
    expect(result.success).toBe(false);
  });
});

describe("ReviewRequestSchema", () => {
  it("accepts APPROVED decision", () => {
    const result = ReviewRequestSchema.safeParse({ requestId: "r1", decision: "APPROVED" });
    expect(result.success).toBe(true);
  });

  it("accepts DENIED decision", () => {
    const result = ReviewRequestSchema.safeParse({ requestId: "r1", decision: "DENIED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = ReviewRequestSchema.safeParse({ requestId: "r1", decision: "MAYBE" });
    expect(result.success).toBe(false);
  });
});

describe("CancelRequestSchema", () => {
  it("accepts valid requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "r1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "" });
    expect(result.success).toBe(false);
  });
});

describe("RevokeAccessSchema", () => {
  it("accepts valid requestId", () => {
    const result = RevokeAccessSchema.safeParse({ requestId: "r1" });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```
npx jest domains/approvals/validations/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create validations file**

Create `domains/approvals/validations/requests.ts`:

```ts
import { z } from "zod";

export const SubmitRequestSchema = z.object({
  resourceType: z.enum(["EVENT", "SERIES", "CHURCH"]),
  resourceId: z.string().min(1),
  message: z.string().max(280).optional(),
});

export const ReviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "DENIED"]),
});

export const CancelRequestSchema = z.object({
  requestId: z.string().min(1),
});

export const RevokeAccessSchema = z.object({
  requestId: z.string().min(1),
});

export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;
export type CancelRequestInput = z.infer<typeof CancelRequestSchema>;
export type RevokeAccessInput = z.infer<typeof RevokeAccessSchema>;
```

- [ ] **Step 4: Run to verify it passes**

```
npx jest domains/approvals/validations/__tests__/requests.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add domains/approvals/validations/
git commit -m "feat(approvals): add approval request Zod validations"
```

---

## Task 4: Config + Types

**Files:**
- Create: `domains/approvals/lib/types.ts`
- Create: `domains/approvals/lib/config.ts`

No tests for these — they are pure type/config files verified by TypeScript.

- [ ] **Step 1: Create types.ts**

Create `domains/approvals/lib/types.ts`:

```ts
import type { ApprovalStatus } from "@prisma/client";

export interface ApprovalActionState {
  error?: string;
}

export interface ResolvedRequest {
  id: string;
  resourceType: ResourceType;
  status: ApprovalStatus;
  message: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  requester: { id: string; name: string | null; image: string | null };
  reviewer: { id: string; name: string } | null;
}
```

- [ ] **Step 2: Create config.ts**

Create `domains/approvals/lib/config.ts`:

```ts
import "server-only";
import type { ChurchRole, EventRole, ResourceType, SeriesRole } from "@prisma/client";
import {
  upsertEventStaff,
  removeEventStaff,
  getEventStaffForUser,
} from "@/domains/roles/dal/event-staff";
import {
  upsertSeriesStaff,
  removeSeriesStaff,
  getSeriesStaffForUser,
} from "@/domains/roles/dal/series-staff";
import {
  upsertChurchMembership,
  removeChurchMembership,
  getChurchMembership,
} from "@/domains/roles/dal/church-memberships";

interface ApprovalConfigEntry {
  role: EventRole | SeriesRole | ChurchRole;
  grantFn: (resourceId: string, userId: string, assignedBy: string) => Promise<unknown>;
  revokeFn: (resourceId: string, userId: string) => Promise<unknown>;
  hasRoleFn: (resourceId: string, userId: string) => Promise<boolean>;
}

export const APPROVAL_CONFIG: Record<ResourceType, ApprovalConfigEntry> = {
  EVENT: {
    role: "EVENT_EDITOR" as EventRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertEventStaff(userId, resourceId, "EVENT_EDITOR", assignedBy),
    revokeFn: (resourceId, userId) => removeEventStaff(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getEventStaffForUser(userId, resourceId).then((r) => r !== null),
  },
  SERIES: {
    role: "SERIES_SESSION_CREATOR" as SeriesRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertSeriesStaff(userId, resourceId, "SERIES_SESSION_CREATOR", assignedBy),
    revokeFn: (resourceId, userId) => removeSeriesStaff(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getSeriesStaffForUser(userId, resourceId).then((r) => r !== null),
  },
  CHURCH: {
    role: "EVENT_CREATOR" as ChurchRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertChurchMembership(userId, resourceId, "EVENT_CREATOR", assignedBy),
    revokeFn: (resourceId, userId) => removeChurchMembership(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getChurchMembership(userId, resourceId).then((r) => r !== null),
  },
};
```

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: no errors from new files.

- [ ] **Step 4: Commit**

```
git add domains/approvals/lib/
git commit -m "feat(approvals): add types and APPROVAL_CONFIG"
```

---

## Task 5: Server Actions (TDD)

**Files:**
- Create: `domains/approvals/actions/__tests__/requests.test.ts`
- Create: `domains/approvals/actions/requests.ts`

- [ ] **Step 1: Create test file**

Create `domains/approvals/actions/__tests__/requests.test.ts`:

```ts
jest.mock("next/cache", () => ({ updateTag: jest.fn() }));
jest.mock("next/navigation", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/domains/roles/lib/can", () => ({ can: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    series: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  getMyRequestForResource: jest.fn(),
  getApprovalRequestById: jest.fn(),
  updateApprovalRequest: jest.fn(),
  deleteApprovalRequest: jest.fn(),
}));
jest.mock("@/domains/approvals/lib/config", () => ({
  APPROVAL_CONFIG: {
    EVENT: {
      role: "EVENT_EDITOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
    SERIES: {
      role: "SERIES_SESSION_CREATOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
    CHURCH: {
      role: "EVENT_CREATOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
  },
}));

import { auth } from "@/auth";
import { can } from "@/domains/roles/lib/can";
import { updateTag } from "next/cache";
import * as dal from "@/domains/approvals/dal/requests";
import * as db from "@/lib/db";
import * as config from "@/domains/approvals/lib/config";
import {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "../requests";

const mockAuth = auth as jest.Mock;
const mockCan = can as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockUpsert = dal.upsertApprovalRequest as jest.Mock;
const mockGetById = dal.getApprovalRequestById as jest.Mock;
const mockUpdate = dal.updateApprovalRequest as jest.Mock;
const mockEventFindUnique = db.prisma.event.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindUnique.mockResolvedValue({ churchId: "church-1" });
});

describe("submitRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await submitRequestAction({ resourceType: "EVENT", resourceId: "e1" });
    expect(result.error).toBe("You must be signed in.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when user already has the role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    (config.APPROVAL_CONFIG.EVENT.hasRoleFn as jest.Mock).mockResolvedValue(true);
    const result = await submitRequestAction({ resourceType: "EVENT", resourceId: "e1" });
    expect(result.error).toBe("You already have access to this resource.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts and invalidates cache on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    (config.APPROVAL_CONFIG.EVENT.hasRoleFn as jest.Mock).mockResolvedValue(false);
    mockUpsert.mockResolvedValue({});
    const result = await submitRequestAction({ resourceType: "EVENT", resourceId: "e1", message: "hi" });
    expect(result.error).toBeUndefined();
    expect(mockUpsert).toHaveBeenCalledWith({ requesterId: "u1", resourceType: "EVENT", resourceId: "e1", message: "hi" });
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
  });
});

describe("reviewRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await reviewRequestAction({ requestId: "r1", decision: "APPROVED" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    mockGetById.mockResolvedValue(null);
    mockCan.mockResolvedValue(true);
    const result = await reviewRequestAction({ requestId: "r1", decision: "APPROVED" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not PENDING", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    mockGetById.mockResolvedValue({ id: "r1", status: "APPROVED", resourceType: "EVENT", resourceId: "e1", requesterId: "u2" });
    mockCan.mockResolvedValue(true);
    const result = await reviewRequestAction({ requestId: "r1", decision: "APPROVED" });
    expect(result.error).toBeDefined();
  });

  it("calls grantFn and invalidates cache on APPROVED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    const request = { id: "r1", status: "PENDING", resourceType: "EVENT", resourceId: "e1", requesterId: "u2" };
    mockGetById.mockResolvedValue(request);
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    const result = await reviewRequestAction({ requestId: "r1", decision: "APPROVED" });
    expect(result.error).toBeUndefined();
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).toHaveBeenCalledWith("e1", "u2", "u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });

  it("does not call grantFn on DENIED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    const request = { id: "r1", status: "PENDING", resourceType: "EVENT", resourceId: "e1", requesterId: "u2" };
    mockGetById.mockResolvedValue(request);
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    await reviewRequestAction({ requestId: "r1", decision: "DENIED" });
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).not.toHaveBeenCalled();
  });
});

describe("cancelRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when user is not the requester", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({ id: "r1", status: "PENDING", requesterId: "other", resourceType: "EVENT", resourceId: "e1" });
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("updates status to CANCELLED and invalidates cache", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({ id: "r1", status: "PENDING", requesterId: "u1", resourceType: "EVENT", resourceId: "e1" });
    mockUpdate.mockResolvedValue({});
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith("r1", { status: "CANCELLED" });
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});

describe("revokeAccessAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not APPROVED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    mockGetById.mockResolvedValue({ id: "r1", status: "PENDING", resourceType: "EVENT", resourceId: "e1", requesterId: "u2" });
    mockCan.mockResolvedValue(true);
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("calls revokeFn and invalidates cache on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    mockGetById.mockResolvedValue({ id: "r1", status: "APPROVED", resourceType: "EVENT", resourceId: "e1", requesterId: "u2" });
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeUndefined();
    expect(config.APPROVAL_CONFIG.EVENT.revokeFn).toHaveBeenCalledWith("e1", "u2");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the server actions file**

Create `domains/approvals/actions/requests.ts`:

```ts
"use server";

import { updateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import type { AuthContext } from "@/domains/roles/lib/can";
import type { Capability } from "@/domains/roles/lib/capabilities";
import type { ResourceType } from "@prisma/client";
import { sessionToActor } from "@/domains/roles/lib/session";
import {
  upsertApprovalRequest,
  getApprovalRequestById,
  updateApprovalRequest,
} from "../dal/requests";
import { APPROVAL_CONFIG } from "../lib/config";
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../validations/requests";
import type { ApprovalActionState } from "../lib/types";

async function resolveAuthContext(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ capability: Capability; context: AuthContext }> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return {
      capability: Capabilities.EVENT_MANAGE_STAFF,
      context: { churchId: event?.churchId ?? "", eventId: resourceId },
    };
  }
  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return {
      capability: Capabilities.SERIES_UPDATE,
      context: { churchId: series?.churchId ?? "", seriesId: resourceId },
    };
  }
  return {
    capability: Capabilities.CHURCH_MANAGE_MEMBERS,
    context: { churchId: resourceId },
  };
}

export async function submitRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = SubmitRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { resourceType, resourceId, message } = parsed.data;
  const userId = session.user.id;

  const alreadyHasRole = await APPROVAL_CONFIG[resourceType].hasRoleFn(resourceId, userId);
  if (alreadyHasRole) return { error: "You already have access to this resource." };

  await upsertApprovalRequest({ requesterId: userId, resourceType, resourceId, message });

  updateTag(`approval-${resourceType}-${resourceId}-${userId}`);
  updateTag(`approval-pending-${resourceType}-${resourceId}`);

  return {};
}

export async function reviewRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorised." };

  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId, decision } = parsed.data;
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "Request is no longer pending." };

  const { capability, context } = await resolveAuthContext(request.resourceType, request.resourceId);
  const allowed = await can(actor, capability, context);
  if (!allowed) return { error: "Unauthorised." };

  await updateApprovalRequest(requestId, {
    status: decision,
    reviewerId: actor.id,
    reviewedAt: new Date(),
  });

  if (decision === "APPROVED") {
    await APPROVAL_CONFIG[request.resourceType].grantFn(
      request.resourceId,
      request.requesterId,
      actor.id
    );
  }

  updateTag(`approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`);
  updateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-resolved-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);
  revalidatePath(`/${request.resourceType.toLowerCase()}s/${request.resourceId}/helpers`);

  return {};
}

export async function cancelRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = CancelRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId } = parsed.data;
  const userId = session.user.id;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.requesterId !== userId) return { error: "Unauthorised." };
  if (request.status !== "PENDING") return { error: "Request is not pending." };

  await updateApprovalRequest(requestId, { status: "CANCELLED" });

  updateTag(`approval-${request.resourceType}-${request.resourceId}-${userId}`);
  updateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);

  return {};
}

export async function revokeAccessAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorised." };

  const parsed = RevokeAccessSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId } = parsed.data;
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "APPROVED") return { error: "Access is not currently approved." };

  const { capability, context } = await resolveAuthContext(request.resourceType, request.resourceId);
  const allowed = await can(actor, capability, context);
  if (!allowed) return { error: "Unauthorised." };

  await updateApprovalRequest(requestId, { status: "REVOKED" });

  try {
    await APPROVAL_CONFIG[request.resourceType].revokeFn(
      request.resourceId,
      request.requesterId
    );
  } catch {
    // idempotent — role may have already been removed
  }

  updateTag(`approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`);
  updateTag(`approval-resolved-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);
  revalidatePath(`/${request.resourceType.toLowerCase()}s/${request.resourceId}/helpers`);

  return {};
}
```

- [ ] **Step 4: Run to verify it passes**

```
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add domains/approvals/actions/requests.ts domains/approvals/actions/__tests__/requests.test.ts
git commit -m "feat(approvals): add submit/review/cancel/revoke server actions"
```

---

## Task 6: Cached Data Actions (TDD)

**Files:**
- Create: `domains/approvals/actions/__tests__/data.test.ts`
- Create: `domains/approvals/actions/data.ts`

- [ ] **Step 1: Create test file**

Create `domains/approvals/actions/__tests__/data.test.ts`:

```ts
const mockCacheTag = jest.fn();
const mockCacheLife = jest.fn();

jest.mock("next/cache", () => ({
  cacheTag: (...args: string[]) => mockCacheTag(...args),
  cacheLife: (ttl: string) => mockCacheLife(ttl),
}));

jest.mock("@/domains/approvals/dal/requests", () => ({
  getMyRequestForResource: jest.fn(),
  getPendingRequestsForResource: jest.fn(),
  getAllRequestsForResource: jest.fn(),
  getApprovalRequestById: jest.fn(),
}));

import * as dal from "@/domains/approvals/dal/requests";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
  getApprovalRequestById,
} from "../data";

const mockGetMy = dal.getMyRequestForResource as jest.Mock;
const mockGetPending = dal.getPendingRequestsForResource as jest.Mock;
const mockGetAll = dal.getAllRequestsForResource as jest.Mock;
const mockGetById = dal.getApprovalRequestById as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheTag.mockReset();
  mockCacheLife.mockReset();
});

describe("getMyRequestForResource", () => {
  it("sets per-user cache tag and delegates to DAL", async () => {
    mockGetMy.mockResolvedValue(null);
    await getMyRequestForResource("EVENT", "e1", "u1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockCacheLife).toHaveBeenCalledWith("seconds");
    expect(mockGetMy).toHaveBeenCalledWith("EVENT", "e1", "u1");
  });
});

describe("getPendingRequestsForResource", () => {
  it("sets pending cache tag and delegates to DAL", async () => {
    mockGetPending.mockResolvedValue([]);
    await getPendingRequestsForResource("SERIES", "s1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-pending-SERIES-s1");
    expect(mockCacheLife).toHaveBeenCalledWith("seconds");
    expect(mockGetPending).toHaveBeenCalledWith("SERIES", "s1");
  });
});

describe("getAllRequestsForResource", () => {
  it("sets resolved cache tag and delegates to DAL", async () => {
    mockGetAll.mockResolvedValue([]);
    await getAllRequestsForResource("CHURCH", "c1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-resolved-CHURCH-c1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockGetAll).toHaveBeenCalledWith("CHURCH", "c1");
  });
});

describe("getApprovalRequestById", () => {
  it("sets per-request cache tag and delegates to DAL", async () => {
    mockGetById.mockResolvedValue(null);
    await getApprovalRequestById("req-1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-request-req-1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockGetById).toHaveBeenCalledWith("req-1");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```
npx jest domains/approvals/actions/__tests__/data.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create data.ts**

Create `domains/approvals/actions/data.ts`:

```ts
"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import type { ResourceType } from "@prisma/client";
import {
  getMyRequestForResource as dalGetMy,
  getPendingRequestsForResource as dalGetPending,
  getAllRequestsForResource as dalGetAll,
  getApprovalRequestById as dalGetById,
} from "../dal/requests";

export async function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  cacheTag(`approval-${resourceType}-${resourceId}-${userId}`);
  cacheLife("seconds");
  return dalGetMy(resourceType, resourceId, userId);
}

export async function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-pending-${resourceType}-${resourceId}`);
  cacheLife("seconds");
  return dalGetPending(resourceType, resourceId);
}

export async function getAllRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-resolved-${resourceType}-${resourceId}`);
  cacheLife("minutes");
  return dalGetAll(resourceType, resourceId);
}

export async function getApprovalRequestById(requestId: string) {
  cacheTag(`approval-request-${requestId}`);
  cacheLife("minutes");
  return dalGetById(requestId);
}
```

- [ ] **Step 4: Run to verify it passes**

```
npx jest domains/approvals/actions/__tests__/data.test.ts --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git add domains/approvals/actions/data.ts domains/approvals/actions/__tests__/data.test.ts
git commit -m "feat(approvals): add cached data action functions"
```

---

## Task 7: UI — RequestTimeline + HelperSummaryRow + HelpersTabs

**Files:**
- Create: `domains/approvals/components/request-timeline.tsx`
- Create: `domains/approvals/components/helper-summary-row.tsx`
- Create: `domains/approvals/components/helpers-tabs.tsx`

No unit tests — client components verified by TypeScript + visual QA.

- [ ] **Step 1: Create request-timeline.tsx**

Create `domains/approvals/components/request-timeline.tsx`:

```tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import type { ApprovalStatus } from "@prisma/client";

interface Props {
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

const OUTCOME_LABELS: Partial<Record<ApprovalStatus, string>> = {
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
};

const OUTCOME_COLORS: Partial<Record<ApprovalStatus, string>> = {
  APPROVED: "text-green-600",
  DENIED: "text-red-500",
  CANCELLED: "text-muted-foreground",
  REVOKED: "text-muted-foreground",
};

export function RequestTimeline({ status, createdAt, reviewedAt }: Props) {
  const isPending = status === "PENDING";
  const isResolved = !isPending;
  const outcomeLabel = OUTCOME_LABELS[status];
  const outcomeColor = OUTCOME_COLORS[status] ?? "text-foreground";

  return (
    <div className="flex flex-col gap-0">
      {/* Step 1: Requested */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className="bg-primary flex size-6 items-center justify-center rounded-full">
            <Check className="size-3.5 text-white" />
          </div>
          <div className="bg-border w-px flex-1 my-1" style={{ minHeight: 24 }} />
        </div>
        <div className="pb-4">
          <p className="text-sm font-medium">Requested</p>
          <p className="text-muted-foreground text-xs" suppressHydrationWarning>
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Step 2: Under review */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              isPending
                ? "border-amber-400 bg-amber-50"
                : "bg-primary border-primary"
            }`}
          >
            {isPending ? (
              <Clock className="size-3.5 text-amber-500" />
            ) : (
              <Check className="size-3.5 text-white" />
            )}
          </div>
          {isResolved && (
            <div className="bg-border w-px flex-1 my-1" style={{ minHeight: 24 }} />
          )}
        </div>
        <div className="pb-4">
          <p className="text-sm font-medium">Under review</p>
          {isPending && (
            <p className="text-muted-foreground text-xs">Waiting for approval</p>
          )}
        </div>
      </div>

      {/* Step 3: Outcome (only if resolved) */}
      {isResolved && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex size-6 items-center justify-center rounded-full ${
                status === "APPROVED"
                  ? "bg-green-500"
                  : "bg-muted border-muted-foreground border-2"
              }`}
            >
              {status === "APPROVED" ? (
                <Check className="size-3.5 text-white" />
              ) : (
                <X className="text-muted-foreground size-3.5" />
              )}
            </div>
          </div>
          <div>
            <p className={`text-sm font-medium ${outcomeColor}`}>{outcomeLabel}</p>
            {reviewedAt && (
              <p className="text-muted-foreground text-xs" suppressHydrationWarning>
                {formatDistanceToNow(reviewedAt, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create helper-summary-row.tsx**

Create `domains/approvals/components/helper-summary-row.tsx`:

```tsx
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus } from "@prisma/client";

const ROLE_LABELS: Record<string, string> = {
  EVENT: "Event Editor",
  SERIES: "Session Creator",
  CHURCH: "Event Creator",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  DENIED: "destructive",
  CANCELLED: "secondary",
  REVOKED: "secondary",
};

interface Props {
  href: string;
  requester: { name: string | null; image: string | null };
  resourceType: string;
  message: string | null;
  createdAt: Date;
  status: ApprovalStatus;
}

export function HelperSummaryRow({
  href,
  requester,
  resourceType,
  message,
  createdAt,
  status,
}: Props) {
  const initials = requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[resourceType] ?? resourceType;

  return (
    <Link
      href={href}
      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
    >
      <Avatar className="size-10 shrink-0">
        {requester.image && (
          <AvatarImage src={requester.image} alt={requester.name ?? ""} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{requester.name ?? "Unknown"}</p>
          {status === "PENDING" ? (
            <span className="text-muted-foreground shrink-0 text-xs" suppressHydrationWarning>
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </span>
          ) : (
            <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className="text-xs">
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{roleLabel}</span>
          {message && (
            <>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground truncate text-xs">{message}</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
```

- [ ] **Step 3: Create helpers-tabs.tsx**

Create `domains/approvals/components/helpers-tabs.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HelperSummaryRow } from "./helper-summary-row";
import type { ApprovalStatus } from "@prisma/client";

interface RequestRow {
  id: string;
  resourceType: string;
  message: string | null;
  createdAt: Date;
  status: ApprovalStatus;
  requester: { name: string | null; image: string | null };
}

interface Props {
  pendingRequests: RequestRow[];
  resolvedRequests: RequestRow[];
  basePath: string;
}

export function HelpersTabs({ pendingRequests, resolvedRequests, basePath }: Props) {
  const members = resolvedRequests.filter((r) => r.status === "APPROVED");
  const history = resolvedRequests.filter((r) => r.status !== "APPROVED");

  return (
    <Tabs defaultValue="requests" className="px-4">
      <TabsList className="w-full">
        <TabsTrigger value="requests" className="flex-1 gap-1.5">
          Requests
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
        <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
      </TabsList>

      <TabsContent value="requests">
        <div className="py-2">
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No pending requests</p>
          ) : (
            pendingRequests.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                resourceType={req.resourceType}
                message={req.message}
                createdAt={req.createdAt}
                status="PENDING"
              />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="members">
        <div className="py-2">
          {members.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No approved members</p>
          ) : (
            members.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                resourceType={req.resourceType}
                message={req.message}
                createdAt={req.createdAt}
                status="APPROVED"
              />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="history">
        <div className="py-2">
          {history.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No history yet</p>
          ) : (
            history.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                resourceType={req.resourceType}
                message={req.message}
                createdAt={req.createdAt}
                status={req.status}
              />
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors from these new files.

- [ ] **Step 5: Commit**

```
git add domains/approvals/components/request-timeline.tsx domains/approvals/components/helper-summary-row.tsx domains/approvals/components/helpers-tabs.tsx
git commit -m "feat(approvals): add RequestTimeline, HelperSummaryRow, and HelpersTabs components"
```

---

## Task 8: UI — RequestDetailActions + RequestForm + MyRequestView

**Files:**
- Create: `domains/approvals/components/request-detail-actions.tsx`
- Create: `domains/approvals/components/request-form.tsx`
- Create: `domains/approvals/components/my-request-view.tsx`

- [ ] **Step 1: Create request-detail-actions.tsx**

Create `domains/approvals/components/request-detail-actions.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { reviewRequestAction, revokeAccessAction } from "@/domains/approvals";

interface Props {
  requestId: string;
  status: ApprovalStatus;
  backHref: string;
}

export function RequestDetailActions({ requestId, status, backHref }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReview(decision: "APPROVED" | "DENIED") {
    setError(null);
    startTransition(async () => {
      const result = await reviewRequestAction({ requestId, decision });
      if (result.error) { setError(result.error); return; }
      router.push(backHref);
    });
  }

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAccessAction({ requestId });
      if (result.error) { setError(result.error); return; }
      router.push(backHref);
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-col gap-3">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => handleReview("APPROVED")} disabled={isPending}>
            {isPending ? "Saving…" : "Approve"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => handleReview("DENIED")} disabled={isPending}>
            Deny
          </Button>
        </div>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRevoke}
          disabled={isPending}
        >
          {isPending ? "Revoking…" : "Revoke access"}
        </Button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Create request-form.tsx**

Create `domains/approvals/components/request-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ResourceType } from "@prisma/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitRequestAction } from "@/domains/approvals";

const FormSchema = z.object({
  message: z.string().max(280, "Max 280 characters").optional(),
});
type FormValues = z.infer<typeof FormSchema>;

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export function RequestForm({ resourceType, resourceId, resourceName }: Props) {
  const router = useRouter();
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
      form.setError("root.serverError", { type: "server", message: result.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Request to help with{" "}
        <span className="text-foreground font-medium">{resourceName}</span>.
        The organiser will review your request.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Add an optional message… (max 280 chars)"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root?.serverError && (
            <p className="text-destructive text-sm">
              {form.formState.errors.root.serverError.message}
            </p>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Send request"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 3: Create my-request-view.tsx**

Create `domains/approvals/components/my-request-view.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelRequestAction } from "@/domains/approvals";
import { RequestTimeline } from "./request-timeline";
import { RequestForm } from "./request-form";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  myRequest: MyRequest | null;
  onClose?: () => void;
}

const SHOW_FORM_STATUSES: ApprovalStatus[] = ["DENIED", "CANCELLED", "REVOKED"];

export function MyRequestView({
  resourceType,
  resourceId,
  resourceName,
  myRequest,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const status = myRequest?.status ?? null;
  const showForm = !status || SHOW_FORM_STATUSES.includes(status);

  function handleCancel() {
    if (!myRequest) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRequestAction({ requestId: myRequest.id });
      if (result.error) { setError(result.error); return; }
      router.refresh();
      onClose?.();
    });
  }

  if (showForm) {
    return (
      <RequestForm
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RequestTimeline
        status={myRequest!.status}
        createdAt={myRequest!.createdAt}
        reviewedAt={myRequest!.reviewedAt}
      />

      {myRequest!.message && (
        <>
          <Separator />
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground mb-1 text-xs">Your message</p>
            <p className="text-sm italic">{myRequest!.message}</p>
          </div>
        </>
      )}

      {status === "APPROVED" && (
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">You now have access</p>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {status === "PENDING" && (
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending ? "Cancelling…" : "Cancel request"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: errors referencing `@/domains/approvals` (barrel not yet created) — this is expected.

- [ ] **Step 5: Commit**

```
git add domains/approvals/components/request-detail-actions.tsx domains/approvals/components/request-form.tsx domains/approvals/components/my-request-view.tsx
git commit -m "feat(approvals): add RequestDetailActions, RequestForm, and MyRequestView components"
```

---

## Task 9: UI — ApprovalMenuTrigger + MyRequestDrawer + Barrel

**Files:**
- Create: `domains/approvals/components/my-request-drawer.tsx`
- Create: `domains/approvals/components/approval-menu-trigger.tsx`
- Create: `domains/approvals/index.ts`

- [ ] **Step 1: Create my-request-drawer.tsx**

Create `domains/approvals/components/my-request-drawer.tsx`:

```tsx
"use client";

import type { ApprovalStatus, ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MyRequestView } from "./my-request-view";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  myRequest: MyRequest | null;
}

function drawerTitle(status: ApprovalStatus | null): string {
  if (status === "PENDING") return "Your request";
  if (status === "APPROVED") return "Access granted";
  return "Help out";
}

export function MyRequestDrawer({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  myRequest,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle(myRequest?.status ?? null)}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <MyRequestView
            resourceType={resourceType}
            resourceId={resourceId}
            resourceName={resourceName}
            myRequest={myRequest}
            onClose={onClose}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Create approval-menu-trigger.tsx**

Create `domains/approvals/components/approval-menu-trigger.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Share2 } from "lucide-react";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MyRequestDrawer } from "./my-request-drawer";

const RESOURCE_PATHS: Record<ResourceType, string> = {
  EVENT: "events",
  SERIES: "series",
  CHURCH: "churches",
};

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  hasRole: boolean;
  myRequest: MyRequest | null;
  pendingCount: number;
  isApprover: boolean;
}

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  hasRole,
  myRequest,
  pendingCount,
  isApprover,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const basePath = `/${RESOURCE_PATHS[resourceType]}/${resourceId}`;
  const status = myRequest?.status ?? null;

  const showHelpOut =
    isAuthenticated &&
    !hasRole &&
    (status === null ||
      status === "DENIED" ||
      status === "CANCELLED" ||
      status === "REVOKED");
  const showViewRequest = status === "PENDING";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label="More options">
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              Help out
            </DropdownMenuItem>
          )}
          {showViewRequest && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              View my request
            </DropdownMenuItem>
          )}
          {isApprover && (
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/helpers`} className="flex w-full items-center justify-between">
                Manage helpers
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MyRequestDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
        myRequest={myRequest}
      />
    </>
  );
}
```

- [ ] **Step 3: Create barrel index.ts**

Create `domains/approvals/index.ts`:

```ts
// Server actions — safe to import from client components
export {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "./actions/requests";

// Data fetchers — server-only, for use in server components/pages
export {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
  getApprovalRequestById,
} from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";

// Types
export type { ApprovalActionState, ResolvedRequest } from "./lib/types";
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add domains/approvals/components/my-request-drawer.tsx domains/approvals/components/approval-menu-trigger.tsx domains/approvals/index.ts
git commit -m "feat(approvals): add MyRequestDrawer, ApprovalMenuTrigger, and barrel exports"
```

---

## Task 10: Parent Page Integration (Events + Series + Churches)

**Files:**
- Modify: `app/(app)/(no-nav)/events/[id]/page.tsx`
- Modify: `app/(app)/(no-nav)/series/[id]/page.tsx`
- Modify: `app/(app)/(no-nav)/churches/[id]/page.tsx`

- [ ] **Step 1: Update events/[id]/page.tsx**

Read the file first: `app/(app)/(no-nav)/events/[id]/page.tsx`

Make these changes:

1. Remove `Share2` from lucide-react imports.

2. Add approval imports at the top (after existing domain imports):

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

3. In the parallel fetches block (where `[event, myAttendance, isSaved]` is currently fetched), also fetch approval data. First, expand the capabilities check to include `canManageStaff`:

Replace:
```ts
const [canEdit, canDelete, canViewAttendees] = actor
  ? await Promise.all([
      can(actor, Capabilities.EVENT_UPDATE, { churchId, eventId: id, seriesId }),
      can(actor, Capabilities.EVENT_DELETE, { churchId, seriesId }),
      can(actor, Capabilities.EVENT_VIEW_ATTENDEES, { churchId, eventId: id }),
    ])
  : [false, false, false];
```

With:
```ts
const [canEdit, canDelete, canViewAttendees, canManageStaff] = actor
  ? await Promise.all([
      can(actor, Capabilities.EVENT_UPDATE, { churchId, eventId: id, seriesId }),
      can(actor, Capabilities.EVENT_DELETE, { churchId, seriesId }),
      can(actor, Capabilities.EVENT_VIEW_ATTENDEES, { churchId, eventId: id }),
      can(actor, Capabilities.EVENT_MANAGE_STAFF, { churchId, eventId: id }),
    ])
  : [false, false, false, false];
```

4. Add approval data fetch after the capabilities block (before `const questions = ...`):

```ts
const [myApprovalRequest, pendingApprovalRequests] = await Promise.all([
  session?.user?.id
    ? getMyRequestForResource("EVENT", id, session.user.id)
    : Promise.resolve(null),
  canManageStaff
    ? getPendingRequestsForResource("EVENT", id)
    : Promise.resolve([]),
]);
```

5. Replace the existing disabled Share2 button:

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

With:

```tsx
<ApprovalMenuTrigger
  resourceType="EVENT"
  resourceId={id}
  resourceName={event.title}
  isAuthenticated={!!session?.user}
  hasRole={canEdit}
  myRequest={myApprovalRequest ?? null}
  pendingCount={pendingApprovalRequests.length}
  isApprover={canManageStaff}
/>
```

- [ ] **Step 2: Update series/[id]/page.tsx**

Read the file first: `app/(app)/(no-nav)/series/[id]/page.tsx`

1. Add approval imports:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

2. After the existing capabilities check (which already computes `canEdit`, `canDelete`, `canAddSession`), add approval fetches:

```ts
const [myApprovalRequest, pendingApprovalRequests] = await Promise.all([
  session?.user?.id
    ? getMyRequestForResource("SERIES", id, session.user.id)
    : Promise.resolve(null),
  canEdit
    ? getPendingRequestsForResource("SERIES", id)
    : Promise.resolve([]),
]);
```

3. Find where the series page renders its header/top actions area and add `ApprovalMenuTrigger`. Look for any share icon or top-right action area. If none exists, add it alongside the existing edit/delete buttons area. Add:

```tsx
<ApprovalMenuTrigger
  resourceType="SERIES"
  resourceId={series.id}
  resourceName={series.name}
  isAuthenticated={!!session?.user}
  hasRole={canAddSession}
  myRequest={myApprovalRequest ?? null}
  pendingCount={pendingApprovalRequests.length}
  isApprover={canEdit}
/>
```

- [ ] **Step 3: Update churches/[id]/page.tsx**

Read the file first: `app/(app)/(no-nav)/churches/[id]/page.tsx`

1. Add imports:

```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

2. The church page currently has no capabilities check. After fetching `church`, add:

```ts
const actor = sessionToActor(session);
const [canManageMembers, canCreateEvent] = actor
  ? await Promise.all([
      can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId: id }),
      can(actor, Capabilities.EVENT_CREATE, { churchId: id }),
    ])
  : [false, false];

const [myApprovalRequest, pendingApprovalRequests] = await Promise.all([
  session?.user?.id
    ? getMyRequestForResource("CHURCH", id, session.user.id)
    : Promise.resolve(null),
  canManageMembers
    ? getPendingRequestsForResource("CHURCH", id)
    : Promise.resolve([]),
]);
```

3. Add `ApprovalMenuTrigger` in the church page JSX. The church page has Share2 icon — find it and replace with:

```tsx
<ApprovalMenuTrigger
  resourceType="CHURCH"
  resourceId={id}
  resourceName={church.name}
  isAuthenticated={!!session?.user}
  hasRole={canCreateEvent}
  myRequest={myApprovalRequest ?? null}
  pendingCount={pendingApprovalRequests.length}
  isApprover={canManageMembers}
/>
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add "app/(app)/(no-nav)/events/[id]/page.tsx" "app/(app)/(no-nav)/series/[id]/page.tsx" "app/(app)/(no-nav)/churches/[id]/page.tsx"
git commit -m "feat(approvals): integrate ApprovalMenuTrigger into event, series, and church detail pages"
```

---

## Task 11: Helpers List Pages

**Files:**
- Create: `app/(app)/(no-nav)/events/[id]/helpers/page.tsx`
- Create: `app/(app)/(no-nav)/series/[id]/helpers/page.tsx`
- Create: `app/(app)/(no-nav)/churches/[id]/helpers/page.tsx`

- [ ] **Step 1: Create events helpers page**

Create `app/(app)/(no-nav)/events/[id]/helpers/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getEventById } from "@/domains/events/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? `Helpers — ${event.title}` : "Helpers" };
}

export default async function EventHelpersPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const event = await getEventById(id);
  if (!event) notFound();

  const actor = sessionToActor(session);
  const canManageStaff = actor
    ? await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
        churchId: event.churchId ?? "",
        eventId: id,
      })
    : false;
  if (!canManageStaff) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("EVENT", id),
    getAllRequestsForResource("EVENT", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/events/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to event"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{event.title}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/events/${id}/helpers`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create series helpers page**

Create `app/(app)/(no-nav)/series/[id]/helpers/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getSeriesById } from "@/domains/series/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const series = await getSeriesById(id);
  return { title: series ? `Helpers — ${series.name}` : "Helpers" };
}

export default async function SeriesHelpersPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const series = await getSeriesById(id);
  if (!series) notFound();

  const actor = sessionToActor(session);
  const canManage = actor
    ? await can(actor, Capabilities.SERIES_UPDATE, {
        churchId: series.churchId,
        seriesId: id,
      })
    : false;
  if (!canManage) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("SERIES", id),
    getAllRequestsForResource("SERIES", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/series/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to series"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{series.name}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/series/${id}/helpers`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create churches helpers page**

Create `app/(app)/(no-nav)/churches/[id]/helpers/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getChurchById } from "@/domains/churches/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);
  return { title: church ? `Helpers — ${church.name}` : "Helpers" };
}

export default async function ChurchHelpersPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const church = await getChurchById(id);
  if (!church) notFound();

  const actor = sessionToActor(session);
  const canManageMembers = actor
    ? await can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId: id })
    : false;
  if (!canManageMembers) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("CHURCH", id),
    getAllRequestsForResource("CHURCH", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/churches/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to church"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{church.name}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/churches/${id}/helpers`}
      />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add "app/(app)/(no-nav)/events/[id]/helpers/" "app/(app)/(no-nav)/series/[id]/helpers/" "app/(app)/(no-nav)/churches/[id]/helpers/"
git commit -m "feat(approvals): add helpers list pages for events, series, and churches"
```

---

## Task 12: Helper Detail Pages

**Files:**
- Create: `app/(app)/(no-nav)/events/[id]/helpers/[requestId]/page.tsx`
- Create: `app/(app)/(no-nav)/series/[id]/helpers/[requestId]/page.tsx`
- Create: `app/(app)/(no-nav)/churches/[id]/helpers/[requestId]/page.tsx`

- [ ] **Step 1: Create events helper detail page**

Create `app/(app)/(no-nav)/events/[id]/helpers/[requestId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/auth";
import { getEventById } from "@/domains/events/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { getApprovalRequestById } from "@/domains/approvals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestTimeline } from "@/domains/approvals/components/request-timeline";
import { RequestDetailActions } from "@/domains/approvals/components/request-detail-actions";

const ROLE_LABELS: Record<string, string> = {
  EVENT: "Event Editor",
  SERIES: "Session Creator",
  CHURCH: "Event Creator",
};

interface Props {
  params: Promise<{ id: string; requestId: string }>;
}

export default async function EventHelperDetailPage({ params }: Props) {
  const [{ id, requestId }, session] = await Promise.all([params, auth()]);

  const [event, request] = await Promise.all([
    getEventById(id),
    getApprovalRequestById(requestId),
  ]);

  if (!event || !request) notFound();
  if (request.resourceType !== "EVENT" || request.resourceId !== id) notFound();

  const actor = sessionToActor(session);
  const canManageStaff = actor
    ? await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
        churchId: event.churchId ?? "",
        eventId: id,
      })
    : false;
  if (!canManageStaff) notFound();

  const backHref = `/events/${id}/helpers`;
  const initials = request.requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[request.resourceType] ?? request.resourceType;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground" aria-label="Back to helpers">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Request detail</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {request.requester.image && (
              <AvatarImage src={request.requester.image} alt={request.requester.name ?? ""} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">{request.requester.name ?? "Unknown"}</p>
            <Badge variant="secondary" className="w-fit text-xs">{roleLabel}</Badge>
            <span className="text-muted-foreground text-xs" suppressHydrationWarning>
              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        <RequestTimeline
          status={request.status}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
        />

        {request.message && (
          <>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">Message</p>
              <p className="text-sm italic">{request.message}</p>
            </div>
          </>
        )}

        <RequestDetailActions requestId={request.id} status={request.status} backHref={backHref} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create series helper detail page**

Create `app/(app)/(no-nav)/series/[id]/helpers/[requestId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/auth";
import { getSeriesById } from "@/domains/series/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { getApprovalRequestById } from "@/domains/approvals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestTimeline } from "@/domains/approvals/components/request-timeline";
import { RequestDetailActions } from "@/domains/approvals/components/request-detail-actions";

const ROLE_LABELS: Record<string, string> = {
  EVENT: "Event Editor",
  SERIES: "Session Creator",
  CHURCH: "Event Creator",
};

interface Props {
  params: Promise<{ id: string; requestId: string }>;
}

export default async function SeriesHelperDetailPage({ params }: Props) {
  const [{ id, requestId }, session] = await Promise.all([params, auth()]);

  const [series, request] = await Promise.all([
    getSeriesById(id),
    getApprovalRequestById(requestId),
  ]);

  if (!series || !request) notFound();
  if (request.resourceType !== "SERIES" || request.resourceId !== id) notFound();

  const actor = sessionToActor(session);
  const canManage = actor
    ? await can(actor, Capabilities.SERIES_UPDATE, {
        churchId: series.churchId,
        seriesId: id,
      })
    : false;
  if (!canManage) notFound();

  const backHref = `/series/${id}/helpers`;
  const initials = request.requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[request.resourceType] ?? request.resourceType;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground" aria-label="Back to helpers">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Request detail</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {request.requester.image && (
              <AvatarImage src={request.requester.image} alt={request.requester.name ?? ""} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">{request.requester.name ?? "Unknown"}</p>
            <Badge variant="secondary" className="w-fit text-xs">{roleLabel}</Badge>
            <span className="text-muted-foreground text-xs" suppressHydrationWarning>
              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        <RequestTimeline
          status={request.status}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
        />

        {request.message && (
          <>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">Message</p>
              <p className="text-sm italic">{request.message}</p>
            </div>
          </>
        )}

        <RequestDetailActions requestId={request.id} status={request.status} backHref={backHref} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create churches helper detail page**

Create `app/(app)/(no-nav)/churches/[id]/helpers/[requestId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/auth";
import { getChurchById } from "@/domains/churches/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { getApprovalRequestById } from "@/domains/approvals";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestTimeline } from "@/domains/approvals/components/request-timeline";
import { RequestDetailActions } from "@/domains/approvals/components/request-detail-actions";

const ROLE_LABELS: Record<string, string> = {
  EVENT: "Event Editor",
  SERIES: "Session Creator",
  CHURCH: "Event Creator",
};

interface Props {
  params: Promise<{ id: string; requestId: string }>;
}

export default async function ChurchHelperDetailPage({ params }: Props) {
  const [{ id, requestId }, session] = await Promise.all([params, auth()]);

  const [church, request] = await Promise.all([
    getChurchById(id),
    getApprovalRequestById(requestId),
  ]);

  if (!church || !request) notFound();
  if (request.resourceType !== "CHURCH" || request.resourceId !== id) notFound();

  const actor = sessionToActor(session);
  const canManageMembers = actor
    ? await can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId: id })
    : false;
  if (!canManageMembers) notFound();

  const backHref = `/churches/${id}/helpers`;
  const initials = request.requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[request.resourceType] ?? request.resourceType;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link href={backHref} className="text-muted-foreground hover:text-foreground" aria-label="Back to helpers">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Request detail</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {request.requester.image && (
              <AvatarImage src={request.requester.image} alt={request.requester.name ?? ""} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">{request.requester.name ?? "Unknown"}</p>
            <Badge variant="secondary" className="w-fit text-xs">{roleLabel}</Badge>
            <span className="text-muted-foreground text-xs" suppressHydrationWarning>
              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        <RequestTimeline
          status={request.status}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
        />

        {request.message && (
          <>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">Message</p>
              <p className="text-sm italic">{request.message}</p>
            </div>
          </>
        )}

        <RequestDetailActions requestId={request.id} status={request.status} backHref={backHref} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add "app/(app)/(no-nav)/events/[id]/helpers/[requestId]/" "app/(app)/(no-nav)/series/[id]/helpers/[requestId]/" "app/(app)/(no-nav)/churches/[id]/helpers/[requestId]/"
git commit -m "feat(approvals): add helper detail pages for events, series, and churches"
```

---

## Task 13: Quality Checks

- [ ] **Step 1: TypeScript**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all approval tests**

```
npx jest domains/approvals/ --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite with coverage**

```
npm run test:coverage
```

Expected: all tests PASS, coverage thresholds ≥ 80%.

- [ ] **Step 4: Lint**

```
npm run lint
```

Expected: no errors. Fix any that appear before continuing.

- [ ] **Step 5: Format check**

```
npm run format:check
```

If failures: run `npm run format` then re-check.

- [ ] **Step 6: Build**

```
npm run build
```

Expected: compiled successfully with no errors.

- [ ] **Step 7: Final commit if any fixes applied**

```
git add -A
git commit -m "chore(approvals): fix lint, format, and type errors"
```
