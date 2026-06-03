# Approval Workflows — Design Spec

**Date:** 2026-06-03
**Branch:** approvals
**Status:** Approved for implementation

---

## Overview

Users can request access to contribute to a resource (event, series, or church) via a "Help out" option in a 3-dot menu on each detail page. The resource owner (approver) reviews requests and approves or denies them. Approval grants a fixed RBAC role specific to that resource type. The requester flow lives in a drawer; the approver management surface is a dedicated page set.

---

## 1. Architecture

**Domain module:** `domains/approvals/` — owns the full request lifecycle.

**Resource types:** EVENT, SERIES, CHURCH.

**Role granted on approval (config map):**

| Resource | Role granted | Assignment table |
|---|---|---|
| EVENT | `EVENT_EDITOR` | `EventStaffAssignment` |
| SERIES | `SERIES_SESSION_CREATOR` | `SeriesStaffAssignment` |
| CHURCH | `EVENT_CREATOR` | `ChurchMembership` |

**Who can approve:**

| Resource | Capability required |
|---|---|
| EVENT | `event:manage_staff` |
| SERIES | `series:update` |
| CHURCH | `church:manage_members` |

**Request lifecycle:**
```
null → PENDING → APPROVED → (REVOKED)
              → DENIED
PENDING → CANCELLED  (by requester)
```

Re-requests after DENIED / CANCELLED / REVOKED are allowed — `upsertApprovalRequest` resets status to PENDING.

---

## 2. Database Schema

New model and enums added to `prisma/schema.prisma`:

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

Key decisions:
- `@@unique([requesterId, resourceType, resourceId])` — one request per user per resource; upsert handles re-requests.
- No `requestedRole` field — role derived from `resourceType` via config map at approval time.
- `reviewedAt` covers both approval and denial timestamps.
- `User` model gets two new relations: `approvalRequests` and `approvalReviews`.

---

## 3. Domain Structure

```
domains/approvals/
  lib/
    config.ts          — APPROVAL_CONFIG map (resourceType → role + grantFn + revokeFn)
    types.ts           — ApprovalActionState, ResolvedRequest
  dal/
    requests.ts        — raw Prisma queries
    __tests__/
      requests.test.ts
  actions/
    requests.ts        — server actions
    data.ts            — cached data fetchers
    __tests__/
      requests.test.ts
      data.test.ts
  validations/
    requests.ts        — Zod schemas
    __tests__/
      requests.test.ts
  components/
    approval-menu-trigger.tsx   — 3-dot dropdown + drawer orchestrator
    my-request-drawer.tsx       — drawer shell + state switcher
    request-form.tsx            — RHF submit form
    request-timeline.tsx        — step indicator
    helpers-tabs.tsx            — tabbed list (client)
    helper-summary-row.tsx      — navigation row
    request-detail-actions.tsx  — approve/deny/revoke buttons
  index.ts             — barrel exports
```

---

## 4. Data Layer

### DAL functions (`dal/requests.ts`)

| Function | Purpose |
|---|---|
| `upsertApprovalRequest(data)` | Create or reset existing DENIED/CANCELLED/REVOKED to PENDING |
| `getMyRequestForResource(type, resourceId, userId)` | Requester's current request for a resource |
| `getPendingRequestsForResource(type, resourceId)` | Queue for approver — PENDING only, includes requester image |
| `getAllRequestsForResource(type, resourceId)` | All non-PENDING requests — members + history |
| `getApprovalRequestById(id)` | Detail view — includes requester image + reviewer name |
| `updateApprovalRequest(id, data)` | Mutate status / reviewerId / reviewedAt |

### Cached actions (`actions/data.ts`)

File-level `"use cache"` directive. Cache tags:

| Tag | Invalidated by |
|---|---|
| `approval-{type}-{resourceId}-{userId}` | submit, cancel |
| `approval-pending-{type}-{resourceId}` | submit, review, cancel |
| `approval-resolved-{type}-{resourceId}` | review, revoke |
| `approval-request-{requestId}` | review, cancel, revoke |

### Config (`lib/config.ts`)

```ts
export const APPROVAL_CONFIG: Record<ResourceType, {
  role: EventRole | SeriesRole | ChurchRole;
  grantFn: (resourceId: string, userId: string, assignedBy: string) => Promise<void>;
  revokeFn: (resourceId: string, userId: string) => Promise<void>;
}> = {
  EVENT:  { role: "EVENT_EDITOR",           grantFn: upsertEventStaff,       revokeFn: removeEventStaff },
  SERIES: { role: "SERIES_SESSION_CREATOR", grantFn: upsertSeriesStaff,      revokeFn: removeSeriesStaff },
  CHURCH: { role: "EVENT_CREATOR",          grantFn: upsertChurchMembership,  revokeFn: removeChurchMembership },
};
```

`grantFn` and `revokeFn` call the roles DAL directly (`domains/roles/dal/*`) — not the action wrappers, since the approval action has already authenticated and checked permissions. The approvals domain does not own role assignment logic; it delegates.

---

## 5. Server Actions (`actions/requests.ts`)

All return `{ error?: string }`. All validate input with Zod before any DB access.

### `submitRequestAction({ resourceType, resourceId, message? })`
1. Auth — must be signed in
2. Validate with `SubmitRequestSchema`
3. Check user doesn't already hold the role for this resource (skip if they do — return error)
4. `upsertApprovalRequest` — creates or resets existing request to PENDING
5. Invalidate `approval-{type}-{resourceId}-{userId}` + `approval-pending-{type}-{resourceId}`

### `reviewRequestAction({ requestId, decision: "APPROVED" | "DENIED" })`
1. Auth + capability check for resource type
2. Fetch request — verify status is PENDING
3. `updateApprovalRequest` — set status, reviewerId, reviewedAt
4. If APPROVED: call `config.grantFn(resourceId, requesterId, reviewerId)`
5. Invalidate all four relevant tags + `revalidatePath` for helpers page

### `cancelRequestAction({ requestId })`
1. Auth — must be the requester
2. Fetch request — verify PENDING + owned by actor
3. `updateApprovalRequest` — set status CANCELLED
4. Invalidate `approval-{type}-{resourceId}-{userId}` + `approval-pending-{type}-{resourceId}` + `approval-request-{requestId}`

### `revokeAccessAction({ requestId })`
1. Auth + capability check for resource type
2. Fetch request — verify status is APPROVED
3. `updateApprovalRequest` — set status REVOKED
4. `config.revokeFn(resourceId, requesterId)` — wrapped in try/catch (idempotent)
5. Invalidate `approval-resolved-{type}-{resourceId}` + `approval-request-{requestId}` + `revalidatePath`

---

## 6. UI & Routes

### 3-dot menu — `ApprovalMenuTrigger`

Replaces the share icon on event/series/church detail pages. Client component — manages dropdown open state + drawer open state.

| Condition | Menu item | Action |
|---|---|---|
| authed + no role + status null/DENIED/CANCELLED/REVOKED | "Help out" | open drawer |
| status PENDING | "View my request" | open drawer |
| isApprover | "Manage helpers" + badge if pending > 0 | navigate to `/[type]/[id]/helpers` |
| always | "Share" (disabled) | — |

**Props:**
```ts
interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  hasRole: boolean;
  myRequest: MyRequest | null;   // full object — needed by drawer
  pendingCount: number;
  isApprover: boolean;
}
```

**Parent pages** (`events/[id]/page.tsx`, `series/[id]/page.tsx`, `churches/[id]/page.tsx`):
- Fetch `myRequest` (full object) + `pendingRequests.length` server-side
- Replace share icon with `<ApprovalMenuTrigger>`

### Requester drawer — `MyRequestDrawer`

shadcn `Drawer` rendered inside `ApprovalMenuTrigger`. Switches on `myRequest?.status`:

| Status | View |
|---|---|
| null / DENIED / CANCELLED / REVOKED | `RequestForm` — RHF + zodResolver, optional textarea max 280 chars, submit calls `submitRequestAction` |
| PENDING | `RequestTimeline` (step 2 active, amber) + cancel button → `cancelRequestAction` → close drawer |
| APPROVED | `RequestTimeline` (fully green) + "You now have access" banner |

`RequestForm` calls `router.refresh()` on success so the parent page re-fetches and the drawer re-renders in PENDING state.

### Approver routes

All under `app/(app)/(no-nav)/` — no bottom nav, consistent with existing detail pages.

```
/events/[id]/helpers
/events/[id]/helpers/[requestId]
/series/[id]/helpers
/series/[id]/helpers/[requestId]
/churches/[id]/helpers
/churches/[id]/helpers/[requestId]
```

### `/[type]/[id]/helpers` — Helpers list page

**Auth:** capability check → `notFound()` if not authorized.

**Data (server-side):**
- `getPendingRequestsForResource` — Requests tab
- `getAllRequestsForResource` — Members + History tabs

**Layout:** page header (resource name + back link) + `HelpersTabs` (client).

**Tabs:**

- **Requests** — badge count if > 0. Rows: avatar + name + role + message preview + time ago. All rows are navigation links → detail page.
- **Members** — rows: avatar + name + role badge + approved date. Navigation links → detail page.
- **History** — rows: avatar + name + status badge (DENIED / CANCELLED / REVOKED) + date. Navigation links → detail page.

Empty states per tab: "No pending requests" / "No approved members" / "No history yet".

**`HelperSummaryRow` (shared):**
```
[Avatar]  Name                        [time or status badge]  ›
          Role · message preview (truncated, 1 line)
```
Entire row is a `<Link>` to the detail page. No inline action buttons.

### `/[type]/[id]/helpers/[requestId]` — Request detail page

**Auth:** same capability check + `getApprovalRequestById(requestId)` → `notFound()` if either fails. Validates `request.resourceId === id` to prevent cross-resource access.

**Layout:**
```
← Back to helpers

[Avatar size-16]  Name
                  Role badge
                  [relative time]

[RequestTimeline — full width]

[Message block — if present]

[RequestDetailActions]
```

**`RequestTimeline`** — step indicator:
- Step 1: Requested (always complete)
- Step 2: Under review (active if PENDING, complete otherwise)
- Step 3: Outcome (approved/denied/cancelled/revoked with label + date)

**`RequestDetailActions` (client, `useTransition` + `useState` for error):**

| Status | Actions |
|---|---|
| PENDING | Approve (primary) + Deny (outline) → `reviewRequestAction` → `router.push(backHref)` |
| APPROVED | Revoke (destructive outline) → `revokeAccessAction` → `router.push(backHref)` |
| DENIED / CANCELLED / REVOKED | None — read-only |

---

## 7. Validations (`validations/requests.ts`)

```ts
SubmitRequestSchema   — { resourceType, resourceId, message?: max 280 }
ReviewRequestSchema   — { requestId, decision: "APPROVED" | "DENIED" }
CancelRequestSchema   — { requestId }
RevokeAccessSchema    — { requestId }
```

---

## 8. Barrel exports (`index.ts`)

```ts
// Actions
export { submitRequestAction, reviewRequestAction, cancelRequestAction, revokeAccessAction } from "./actions/requests";

// Data fetchers (server-only)
export { getMyRequestForResource, getPendingRequestsForResource, getAllRequestsForResource, getApprovalRequestById } from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";

// Types
export type { ApprovalActionState, ResolvedRequest } from "./lib/types";
```

---

## 9. Out of Scope

- Notifications to approver on new request (future)
- Notifications to requester on review decision (future)
- Search / filter within helpers tabs
- Pagination (no resource expected to exceed 50 requests short-term)
- Approver choosing which role to grant
- Role upgrade (grant only, not upgrade from EDITOR to MANAGER)
