# Approval Workflows — Screens Redesign

**Date:** 2026-06-01
**Branch:** approval-workflows
**Status:** Approved
**Builds on:** `2026-06-01-approval-workflows-design.md`

## Overview

Replace the inline `PendingRequestsCard` at the bottom of detail pages with a pair of full drawers accessible from the existing 3-dot `ApprovalMenuTrigger`. Requesters get a "View my request" status screen with cancel capability. Approvers get a richer, more professional requests drawer in place of the bottom card.

---

## What Changes

### Removed
- `PendingRequestsCard` component — deleted entirely, no longer used
- `PendingRequestsCard` export from `domains/approvals/index.ts`
- `PendingRequestsCard` render and import from all three detail pages

### Added
- `cancelRequestAction` server action
- `RequestStatusDrawer` component — requester's status screen
- `ApproverRequestsDrawer` component — approver's requests screen
- DAL: `requestedRole` and `createdAt` added to `getPendingRequestsForResource` select

### Modified
- `ApprovalMenuTrigger` — extended props, new internal drawer state, three new menu items
- `domains/approvals/actions/data.ts` — `getPendingRequestsForResource` cache wrapper unchanged (DAL select expanded)
- All three detail pages — pass `myRequest` (full object), `pendingRequests`, `isApprover` to trigger; remove `PendingRequestsCard`

---

## Data & Actions

### `cancelRequestAction(requestId: string): Promise<ApprovalActionState>`

Server action (`"use server"`):

1. Auth check via `getActor()` — return `{ error: "Unauthorised." }` if not signed in
2. Fetch request by `requestId` via `getApprovalRequestById`
3. Return `{ error: "Request not found." }` if missing
4. Return `{ error: "Unauthorised." }` if `request.requesterId !== actor.id`
5. Return `{ error: "Request already reviewed." }` if `request.status !== "PENDING"`
6. Delete the `ApprovalRequest` row via new DAL function `deleteApprovalRequest(requestId)`
7. `updateTag` for both cache tags, `revalidatePath` for resource route
8. Return `{ success: "Request cancelled." }`

No notifications sent on cancel.

### Validation addition: `CancelRequestSchema`

Added to `domains/approvals/validations/requests.ts`:
```ts
export const CancelRequestSchema = z.object({
  requestId: z.string().min(1),
});
```

### DAL addition: `deleteApprovalRequest(id: string)`

```ts
export function deleteApprovalRequest(id: string) {
  return prisma.approvalRequest.delete({ where: { id } });
}
```

### DAL: `getPendingRequestsForResource` — no query change needed

The existing query uses `include` (not `select`), so Prisma already returns all scalar fields including `requestedRole` and `createdAt`. Only the `PendingRequest` interface in `ApproverRequestsDrawer` needs to expose these fields — the data is already present in the response.

---

## Component Changes

### `ApprovalMenuTrigger` (modified)

**New props interface:**

```ts
interface MyRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface PendingRequest {
  id: string;
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  hasRole: boolean;
  myRequest: MyRequest | null;          // replaces requestStatus (now full object)
  pendingRequests: PendingRequest[];    // moved from pages
  isApprover: boolean;                  // moved from pages
}
```

**Internal state:**

```ts
const [drawerOpen, setDrawerOpen] = useState<
  "request-access" | "my-status" | "approver" | null
>(null);
```

**Dropdown menu logic:**

| Item | Condition | Action |
|---|---|---|
| "Help out" | `isAuthenticated && !hasRole && (myRequest === null \|\| myRequest.status === "DENIED")` | opens `"request-access"` |
| "View my request" | `myRequest?.status === "PENDING"` | opens `"my-status"` |
| "Help requests (N)" | `isApprover && pendingRequests.length > 0` | opens `"approver"` |
| "Share" | always | disabled |

The "Help requests" item shows a `Badge` with the count inline in the menu item label.

**Children rendered:**

```tsx
<RequestAccessDrawer open={drawerOpen === "request-access"} ... />
<RequestStatusDrawer open={drawerOpen === "my-status"} myRequest={myRequest!} ... />
<ApproverRequestsDrawer open={drawerOpen === "approver"} requests={pendingRequests} ... />
```

---

### New: `RequestStatusDrawer`

**File:** `domains/approvals/components/request-status-drawer.tsx`

**Props:**
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRequest: MyRequest;
  resourceName: string;
}
```

**Layout (shadcn `Drawer`, bottom):**

```
DrawerHeader
  DrawerTitle: "Your request"
  DrawerDescription: "For [resourceName]"

Body (px-4)
  Status badge row
    Badge: "Pending" (yellow) | "Approved" (green) | "Denied" (red)

  Timeline section
    "Requested" + formatted date (e.g. "2 Jun 2026, 3:45 pm")
    If reviewedAt: "Reviewed" + formatted date

  Message section (if myRequest.message)
    Subtle quoted block with the original message text

DrawerFooter
  [If PENDING] "Cancel request" Button (variant="destructive", outline)
  "Close" Button (variant="outline")
```

Cancel flow: calls `cancelRequestAction(myRequest.id)`. On success: `onOpenChange(false)`. On error: shows inline error text below button.

Uses `useTransition` for pending state on the cancel button.

---

### New: `ApproverRequestsDrawer`

**File:** `domains/approvals/components/approver-requests-drawer.tsx`

**Props:**
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: PendingRequest[];
  resourceType: ResourceType;
  resourceId: string;
}
```

**Layout (shadcn `Drawer`, bottom):**

```
DrawerHeader
  DrawerTitle: "Help requests"
  DrawerDescription: "[N] people want to help out" (pluralised)

Body (scrollable if many requests)
  For each request, separated by <Separator>:
    Row:
      Avatar (size-12) + AvatarFallback (2-char initials)
      Right column:
        Name (font-medium) + relative time ("2 days ago") in muted text
        Badge: role label (e.g. "Event Editor") — maps requestedRole string to display label
        Message block (if present): italic muted text in a subtle bg-muted/50 rounded block
        Button row: "Approve" (full primary) + "Deny" (outline) side by side

DrawerFooter
  "Close" Button (variant="outline")
```

Role label mapping (client-safe constant, no server imports):
```ts
const ROLE_LABELS: Record<string, string> = {
  EVENT_EDITOR: "Event Editor",
  SERIES_SESSION_CREATOR: "Session Creator",
  EVENT_CREATOR: "Event Creator",
};
```

Each row uses its own `useTransition` for independent pending state. On approve/deny: calls `reviewRequestAction`, row stays visible until page revalidates (the action calls `revalidatePath` which triggers a server re-render removing the resolved request).

---

### Deleted: `PendingRequestsCard`

File `domains/approvals/components/pending-requests-card.tsx` is deleted. Export removed from `domains/approvals/index.ts`.

---

## Page Changes

All three pages (`events/[id]/page.tsx`, `series/[id]/page.tsx`, `churches/[id]/page.tsx`):

**Remove:**
- `PendingRequestsCard` import and JSX render
- The `canManageStaff` / `canManageSeries` / `canManageMembers` variable is kept (now passed as `isApprover`)

**Update `ApprovalMenuTrigger` props:**
- `requestStatus={myRequest?.status ?? null}` → `myRequest={myRequest ?? null}` (pass full object)
- Add `pendingRequests={pendingRequests}`
- Add `isApprover={canManageStaff}` (or equivalent per page)

**Data fetching unchanged** — `getMyRequestForResource` and `getPendingRequestsForResource` calls remain as-is.

---

## Exports (`domains/approvals/index.ts`)

```ts
// Remove:
export { PendingRequestsCard } from "./components/pending-requests-card";

// Add:
export { cancelRequestAction } from "./actions/requests";
```

`RequestStatusDrawer` and `ApproverRequestsDrawer` are internal to `ApprovalMenuTrigger` — not exported from the barrel.

---

## Out of Scope

- Notifications on cancel (explicitly excluded)
- Pagination of pending requests in the approver drawer (YAGNI at current scale)
- Approved/denied history view for approvers
