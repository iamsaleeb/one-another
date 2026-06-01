# Approval Workflows Design

**Date:** 2026-06-01  
**Branch:** approval-workflows  
**Status:** Approved

## Overview

Allow users to request a helper role on a specific resource (event, series, or church) via a "Help out" flow on each detail page. Approvers (those with the manage capability for that resource) are notified, can approve or deny from the detail page or their inbox, and the requester is notified of the outcome.

---

## Data Model

New Prisma model added to `schema.prisma`:

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

model ApprovalRequest {
  id            String         @id @default(cuid())
  requesterId   String
  resourceType  ResourceType
  resourceId    String
  requestedRole String         // "EVENT_EDITOR" | "SERIES_SESSION_CREATOR" | "EVENT_CREATOR"
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
}
```

- `requestedRole` is a plain `String` (not a Prisma enum) because it spans three separate enums (`EventRole`, `SeriesRole`, `ChurchRole`). Validation enforced at the domain layer.
- `@@unique([requesterId, resourceType, resourceId])` prevents duplicate requests per user per resource.
- One pending request per user per resource. Re-requesting after denial is allowed (unique constraint is on the triple, not status — upsert replaces on re-request).

Two new `NotificationType` enum values:
```prisma
ROLE_REQUEST_RECEIVED   // to approver(s) on submission
ROLE_REQUEST_OUTCOME    // to requester on approve/deny
```

---

## Domain Structure

New `domains/approvals/` following existing domain conventions:

```
domains/approvals/
  actions/
    requests.ts         # submitRequestAction, reviewRequestAction
    data.ts             # getPendingRequestsForResource, getMyRequestForResource
  dal/
    requests.ts         # raw DB queries
  lib/
    types.ts            # ApprovalActionState
    resolvers.ts        # maps ResourceType → role + approve capability + role-granting function
  validations/
    requests.ts         # SubmitRequestSchema, ReviewRequestSchema
  components/
    approval-menu-trigger.tsx   # 3-dot DropdownMenu, shown on all detail pages
    request-access-sheet.tsx    # bottom Sheet with optional message form
    pending-requests-card.tsx   # approver-only card with approve/deny buttons
  index.ts
```

### Key: `resolvers.ts`

This is the scalability hinge. Adding a new resource type only requires adding one entry here.

```ts
export const APPROVAL_CONFIG = {
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
} satisfies Record<ResourceType, ApprovalConfig>;
```

### `submitRequestAction`

1. Auth check — must be signed in.
2. Validate input (resourceType, resourceId, optional message ≤ 280 chars).
3. Check requester does not already hold the target role.
4. Upsert `ApprovalRequest` (replaces a prior DENIED request cleanly).
5. Fan out `ROLE_REQUEST_RECEIVED` notification to all current approvers for that resource.

### `reviewRequestAction`

1. Auth check.
2. Validate input (requestId, decision: APPROVED | DENIED).
3. Verify actor has `approveCapability` for the resource (via existing `can()`).
4. Update `ApprovalRequest` status, `reviewedBy`, `reviewedAt`.
5. If APPROVED: call `APPROVAL_CONFIG[resourceType].grant(...)`.
6. Send `ROLE_REQUEST_OUTCOME` notification to requester.

---

## Notifications

Two new types registered in `domains/notifications/types.ts`:

| Type | Recipient | Trigger |
|---|---|---|
| `ROLE_REQUEST_RECEIVED` | All current approvers for resource | User submits a request |
| `ROLE_REQUEST_OUTCOME` | Requester | Approver approves or denies |

Notification `data` field carries `{ requestId, resourceType, resourceId, decision? }` so the app can deep-link to the relevant detail page.

Fan-out for `ROLE_REQUEST_RECEIVED`: query all users who currently have the approve capability on that resource (e.g. all `EVENT_MANAGER` staff for that event + church `EVENT_MANAGER`/`CHURCH_ADMIN` members), create one `Notification` row per approver.

---

## UI Components (in `domains/approvals/components/`)

### `ApprovalMenuTrigger`

- `"use client"` component (needs dropdown + sheet interactivity).
- Props fetched server-side by the parent page, passed down: `resourceType`, `resourceId`, `resourceName`, `isAuthenticated`, `requestStatus` (`null | "PENDING" | "APPROVED" | "DENIED"`), `hasRole`.
- shadcn `DropdownMenu` with `MoreHorizontal` icon as trigger.
- Menu items:
  - "Help out" — shown when `isAuthenticated && !hasRole && requestStatus === null`
  - "Request pending" (disabled) — shown when `requestStatus === "PENDING"`
  - Hidden entirely when `!isAuthenticated`, `hasRole`, or `requestStatus === "APPROVED"`
- Share item (disabled, already exists pattern) kept alongside.
- Replaces the current profile icon area on each detail page.

### `RequestAccessSheet`

- shadcn `Sheet` sliding up from bottom (mobile-first).
- Opened from `ApprovalMenuTrigger` "Help out" item.
- Displays: "You'll be added as a helper for [resourceName]."
- RHF + zodResolver form with shadcn `Textarea` (optional, max 280 chars).
- shadcn `Button` to submit → calls `submitRequestAction`.
- On success: sheet closes, menu state updates to "PENDING".

### `PendingRequestsCard`

- shadcn `Card` with shadcn `Badge` showing pending count in header.
- Only rendered when actor has the approve capability for the resource.
- Each row: shadcn `Avatar` + requester name + optional message + "Approve" / "Deny" `Button`s.
- Buttons call `reviewRequestAction` inline — no navigation needed.
- Collapses to nothing when no pending requests.

---

## Page Integration

Each detail page (`events/[id]/page.tsx`, `series/[id]/page.tsx`, `churches/[id]/page.tsx`) adds:

1. Fetch `myRequest` via `getMyRequestForResource(resourceType, resourceId, userId)`.
2. If actor has approve capability: fetch `pendingRequests` via `getPendingRequestsForResource(resourceType, resourceId)`.
3. Render `<ApprovalMenuTrigger ... />` where the profile icon was.
4. Render `<PendingRequestsCard requests={pendingRequests} />` in the detail card (only if approver).

Minimal page-level code — all logic stays in the domain.

---

## Authorization Rules

| Resource | Requestable role | Who can approve |
|---|---|---|
| Event | `EVENT_EDITOR` | Users with `event:manage_staff` (event `EVENT_MANAGER` or church `EVENT_MANAGER`/`CHURCH_ADMIN`) |
| Series | `SERIES_SESSION_CREATOR` | Users with `series:update` (series `SERIES_MANAGER` or church `EVENT_MANAGER`/`CHURCH_ADMIN`) |
| Church | `EVENT_CREATOR` | Users with `church:manage_members` (church `CHURCH_ADMIN`) |

All authorization checks use the existing `can()` function — no new auth logic introduced.

---

## Out of Scope

- Requesting elevated roles (e.g. `EVENT_MANAGER`) — only one requestable role per resource type.
- Unauthenticated users — must be signed in to request.
- Admin override UI — platform admins can directly assign roles via existing actions.
