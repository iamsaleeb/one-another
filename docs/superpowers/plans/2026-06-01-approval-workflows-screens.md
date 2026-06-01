# Approval Workflows Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline `PendingRequestsCard` at the bottom of detail pages with two full drawers accessible from the 3-dot menu — a requester status screen with cancel capability, and a richer approver requests drawer.

**Architecture:** Extend `ApprovalMenuTrigger` to own all drawer state (three drawers: request-access, my-status, approver). Two new components (`RequestStatusDrawer`, `ApproverRequestsDrawer`) replace `PendingRequestsCard`. One new server action (`cancelRequestAction`) deletes a PENDING request. Pages pass `myRequest` (full object), `pendingRequests`, and `isApprover` directly to `ApprovalMenuTrigger`.

**Tech Stack:** Next.js App Router, shadcn/ui (Drawer, Badge, Avatar, Separator, Button), React Hook Form, date-fns, Prisma, Jest

---

## File Map

**Create:**
- `domains/approvals/components/request-status-drawer.tsx` — requester's status screen with cancel
- `domains/approvals/components/approver-requests-drawer.tsx` — approver's requests drawer

**Modify:**
- `domains/approvals/validations/requests.ts` — add `CancelRequestSchema`
- `domains/approvals/validations/__tests__/requests.test.ts` — add cancel schema tests
- `domains/approvals/dal/requests.ts` — add `deleteApprovalRequest`
- `domains/approvals/dal/__tests__/requests.test.ts` — add delete test
- `domains/approvals/actions/requests.ts` — add `cancelRequestAction`
- `domains/approvals/actions/__tests__/requests.test.ts` — add cancel action tests
- `domains/approvals/components/approval-menu-trigger.tsx` — new props, three-drawer orchestration
- `domains/approvals/index.ts` — add `cancelRequestAction`, remove `PendingRequestsCard`
- `app/(app)/(no-nav)/events/[id]/page.tsx` — updated trigger props, remove card
- `app/(app)/(no-nav)/series/[id]/page.tsx` — updated trigger props, remove card
- `app/(app)/(no-nav)/churches/[id]/page.tsx` — updated trigger props, remove card

**Delete:**
- `domains/approvals/components/pending-requests-card.tsx`

---

## Task 1: Validation + DAL

**Files:**
- Modify: `domains/approvals/validations/requests.ts`
- Modify: `domains/approvals/validations/__tests__/requests.test.ts`
- Modify: `domains/approvals/dal/requests.ts`
- Modify: `domains/approvals/dal/__tests__/requests.test.ts`

- [ ] **Step 1: Add `CancelRequestSchema` to validations**

In `domains/approvals/validations/requests.ts`, add after `ReviewRequestSchema`:

```ts
export const CancelRequestSchema = z.object({
  requestId: z.string().min(1),
});

export type CancelRequestInput = z.infer<typeof CancelRequestSchema>;
```

- [ ] **Step 2: Add cancel schema tests**

In `domains/approvals/validations/__tests__/requests.test.ts`, add a new describe block after the existing ones:

```ts
describe("CancelRequestSchema", () => {
  it("accepts valid requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "req-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing requestId", () => {
    const result = CancelRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "" });
    expect(result.success).toBe(false);
  });
});
```

Update the import at the top of the test file to include `CancelRequestSchema`:

```ts
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
} from "../requests";
```

- [ ] **Step 3: Run validation tests**

```bash
npx jest domains/approvals/validations/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — 12 tests passing.

- [ ] **Step 4: Add `deleteApprovalRequest` to DAL**

In `domains/approvals/dal/requests.ts`, add after `updateApprovalRequest`:

```ts
export function deleteApprovalRequest(id: string) {
  return prisma.approvalRequest.delete({ where: { id } });
}
```

- [ ] **Step 5: Add delete DAL test**

In `domains/approvals/dal/__tests__/requests.test.ts`, add `delete: jest.fn()` to the `approvalRequest` mock object:

```ts
jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),   // ADD THIS
    },
    // ... rest unchanged
  },
}));
```

Then add to the test file after the existing `upsertApprovalRequest` describe:

```ts
describe("deleteApprovalRequest", () => {
  it("deletes by id", async () => {
    mockApprovalRequest.delete.mockResolvedValue({} as never);
    await deleteApprovalRequest("req-1");
    expect(mockApprovalRequest.delete).toHaveBeenCalledWith({
      where: { id: "req-1" },
    });
  });
});
```

Update the import at the top of the DAL test to include `deleteApprovalRequest`:

```ts
import {
  upsertApprovalRequest,
  getMyRequestForResource,
  getPendingRequestsForResource,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
  deleteApprovalRequest,
} from "../requests";
```

Also update `mockApprovalRequest` type cast to include `delete`:

```ts
const mockApprovalRequest = prisma.approvalRequest as jest.Mocked<
  typeof prisma.approvalRequest
>;
```

(This already handles `delete` since it's on the real type — no change needed to the cast.)

- [ ] **Step 6: Run DAL tests**

```bash
npx jest domains/approvals/dal/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — 10 tests passing.

- [ ] **Step 7: Commit**

```bash
git add domains/approvals/validations/ domains/approvals/dal/
git commit -m "feat(approvals): add CancelRequestSchema and deleteApprovalRequest"
```

---

## Task 2: cancelRequestAction (TDD)

**Files:**
- Modify: `domains/approvals/actions/requests.ts`
- Modify: `domains/approvals/actions/__tests__/requests.test.ts`

- [ ] **Step 1: Add cancel action tests**

In `domains/approvals/actions/__tests__/requests.test.ts`:

1. Add `deleteApprovalRequest: jest.fn()` to the DAL mock block:

```ts
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  updateApprovalRequest: jest.fn(),
  getApprovalRequestById: jest.fn(),
  getApproverIdsForResource: jest.fn(),
  resolveApprovalAuthContext: jest.fn(),
  hasDirectRoleForResource: jest.fn(),
  deleteApprovalRequest: jest.fn(),   // ADD THIS
}));
```

2. Update the import at the top to include `cancelRequestAction`:

```ts
import { submitRequestAction, reviewRequestAction, cancelRequestAction } from "../requests";
```

3. Add a new describe block after the existing `reviewRequestAction` tests:

```ts
describe("cancelRequestAction", () => {
  const myRequest = {
    id: "req-1",
    requesterId: "user-1",
    resourceType: "EVENT" as const,
    resourceId: "e1",
    status: "PENDING" as const,
    requestedRole: "EVENT_EDITOR",
    requester: { id: "user-1", name: "Alice" },
  };

  beforeEach(() => {
    mockDal.getApprovalRequestById.mockResolvedValue(myRequest as never);
    mockDal.deleteApprovalRequest.mockResolvedValue({} as never);
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await cancelRequestAction({ requestId: "" });
    expect(result).toHaveProperty("fieldErrors");
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "missing" });
    expect(result).toEqual({ error: "Request not found." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when not the requester", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...myRequest,
      requesterId: "someone-else",
    } as never);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when request already reviewed", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...myRequest,
      status: "APPROVED",
    } as never);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Request already reviewed." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("deletes request and revalidates on success", async () => {
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ success: "Request cancelled." });
    expect(mockDal.deleteApprovalRequest).toHaveBeenCalledWith("req-1");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: FAIL — `cancelRequestAction is not a function`

- [ ] **Step 3: Implement `cancelRequestAction`**

In `domains/approvals/actions/requests.ts`:

1. Add `CancelRequestSchema` to the validations import:

```ts
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
} from "../validations/requests";
```

2. Add `deleteApprovalRequest` to the DAL import:

```ts
import {
  upsertApprovalRequest,
  updateApprovalRequest,
  getApprovalRequestById,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
  deleteApprovalRequest,
} from "../dal/requests";
```

3. Add the action after `reviewRequestAction`:

```ts
export async function cancelRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = CancelRequestSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { requestId } = parsed.data;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.requesterId !== actor.id) return { error: "Unauthorised." };
  if (request.status !== "PENDING")
    return { error: "Request already reviewed." };

  await deleteApprovalRequest(requestId);

  updateTag(
    `approval-${request.resourceType}-${request.resourceId}-${actor.id}`
  );
  updateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  revalidatePath(
    resourcePath(request.resourceType, request.resourceId),
    "page"
  );
  return { success: "Request cancelled." };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest domains/approvals/actions/__tests__/requests.test.ts --no-coverage
```

Expected: PASS — 16 tests passing.

- [ ] **Step 5: Commit**

```bash
git add domains/approvals/actions/
git commit -m "feat(approvals): add cancelRequestAction"
```

---

## Task 3: RequestStatusDrawer Component

**Files:**
- Create: `domains/approvals/components/request-status-drawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// domains/approvals/components/request-status-drawer.tsx
"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { ApprovalStatus } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelRequestAction } from "../actions/requests";
import type { ApprovalActionState } from "../lib/types";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRequest: MyRequest;
  resourceName: string;
}

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  DENIED: {
    label: "Denied",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
};

function formatDate(date: Date): string {
  return format(date, "d MMM yyyy, h:mm a");
}

export function RequestStatusDrawer({
  open,
  onOpenChange,
  myRequest,
  resourceName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const statusConfig = STATUS_CONFIG[myRequest.status];

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result: ApprovalActionState = await cancelRequestAction({
        requestId: myRequest.id,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Your request</DrawerTitle>
          <DrawerDescription>For {resourceName}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Requested</span>
              <span suppressHydrationWarning>
                {formatDate(myRequest.createdAt)}
              </span>
            </div>
            {myRequest.reviewedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reviewed</span>
                <span suppressHydrationWarning>
                  {formatDate(myRequest.reviewedAt)}
                </span>
              </div>
            )}
          </div>

          {myRequest.message && (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs">
                  Your message
                </p>
                <p className="text-sm italic">{myRequest.message}</p>
              </div>
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DrawerFooter>
          {myRequest.status === "PENDING" && (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
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
git add domains/approvals/components/request-status-drawer.tsx
git commit -m "feat(approvals): add RequestStatusDrawer component"
```

---

## Task 4: ApproverRequestsDrawer Component

**Files:**
- Create: `domains/approvals/components/approver-requests-drawer.tsx`

- [ ] **Step 1: Create the component**

```tsx
// domains/approvals/components/approver-requests-drawer.tsx
"use client";

import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { reviewRequestAction } from "../actions/requests";

interface PendingRequest {
  id: string;
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: PendingRequest[];
  resourceType: ResourceType;
  resourceId: string;
}

const ROLE_LABELS: Record<string, string> = {
  EVENT_EDITOR: "Event Editor",
  SERIES_SESSION_CREATOR: "Session Creator",
  EVENT_CREATOR: "Event Creator",
};

export function ApproverRequestsDrawer({
  open,
  onOpenChange,
  requests,
}: Props) {
  const count = requests.length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Help requests</DrawerTitle>
          <DrawerDescription>
            {count === 1 ? "1 person wants" : `${count} people want`} to help
            out
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex max-h-[60vh] flex-col overflow-y-auto px-4 pb-2">
          {requests.map((req, i) => (
            <div key={req.id}>
              {i > 0 && <Separator className="my-4" />}
              <RequestRow request={req} />
            </div>
          ))}
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function RequestRow({ request }: { request: PendingRequest }) {
  const [isPending, startTransition] = useTransition();

  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";

  const roleLabel = ROLE_LABELS[request.requestedRole] ?? request.requestedRole;

  function handleReview(decision: "APPROVED" | "DENIED") {
    startTransition(() =>
      reviewRequestAction({ requestId: request.id, decision }).then(() => {})
    );
  }

  return (
    <div className="flex gap-3 py-1">
      <Avatar className="size-12 shrink-0">
        {request.requester.image && (
          <AvatarImage
            src={request.requester.image}
            alt={request.requester.name ?? ""}
          />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {request.requester.name ?? "Unknown"}
          </p>
          <span
            className="text-muted-foreground shrink-0 text-xs"
            suppressHydrationWarning
          >
            {formatDistanceToNow(request.createdAt, { addSuffix: true })}
          </span>
        </div>

        <Badge variant="secondary" className="w-fit text-xs">
          {roleLabel}
        </Badge>

        {request.message && (
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-muted-foreground text-sm italic">
              {request.message}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleReview("APPROVED")}
            disabled={isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
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
git add domains/approvals/components/approver-requests-drawer.tsx
git commit -m "feat(approvals): add ApproverRequestsDrawer component"
```

---

## Task 5: Update ApprovalMenuTrigger

**Files:**
- Modify: `domains/approvals/components/approval-menu-trigger.tsx`

- [ ] **Step 1: Replace the entire file**

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { RequestAccessDrawer } from "./request-access-drawer";
import { RequestStatusDrawer } from "./request-status-drawer";
import { ApproverRequestsDrawer } from "./approver-requests-drawer";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
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
  myRequest: MyRequest | null;
  pendingRequests: PendingRequest[];
  isApprover: boolean;
}

type DrawerState = "request-access" | "my-status" | "approver" | null;

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  hasRole,
  myRequest,
  pendingRequests,
  isApprover,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState<DrawerState>(null);

  const requestStatus = myRequest?.status ?? null;

  const showHelpOut =
    isAuthenticated &&
    !hasRole &&
    (requestStatus === null || requestStatus === "DENIED");
  const showViewRequest = requestStatus === "PENDING";
  const showApproverItem = isApprover && pendingRequests.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="More options"
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("request-access")}>
              Help out
            </DropdownMenuItem>
          )}
          {showViewRequest && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("my-status")}>
              View my request
            </DropdownMenuItem>
          )}
          {showApproverItem && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("approver")}>
              Help requests
              <Badge variant="secondary" className="ml-auto">
                {pendingRequests.length}
              </Badge>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestAccessDrawer
        open={drawerOpen === "request-access"}
        onOpenChange={(open) => setDrawerOpen(open ? "request-access" : null)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />

      {myRequest && (
        <RequestStatusDrawer
          open={drawerOpen === "my-status"}
          onOpenChange={(open) => setDrawerOpen(open ? "my-status" : null)}
          myRequest={myRequest}
          resourceName={resourceName}
        />
      )}

      <ApproverRequestsDrawer
        open={drawerOpen === "approver"}
        onOpenChange={(open) => setDrawerOpen(open ? "approver" : null)}
        requests={pendingRequests}
        resourceType={resourceType}
        resourceId={resourceId}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: TS errors on the three detail pages (they still pass the old `requestStatus` prop). That's expected — fixed in Tasks 7-9.

- [ ] **Step 3: Commit**

```bash
git add domains/approvals/components/approval-menu-trigger.tsx
git commit -m "feat(approvals): extend ApprovalMenuTrigger with three-drawer orchestration"
```

---

## Task 6: Update index.ts + Delete PendingRequestsCard

**Files:**
- Modify: `domains/approvals/index.ts`
- Delete: `domains/approvals/components/pending-requests-card.tsx`

- [ ] **Step 1: Update index.ts**

Replace the entire content of `domains/approvals/index.ts`:

```ts
// Server actions — importable from client components
export {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
} from "./actions/requests";

// Data fetching — server-only, for use in server components/pages
export {
  getMyRequestForResource,
  getPendingRequestsForResource,
} from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";

// Types
export type { ApprovalActionState } from "./lib/types";
```

- [ ] **Step 2: Delete PendingRequestsCard**

```bash
rm "C:\code\one-another1\domains\approvals\components\pending-requests-card.tsx"
```

Or on Windows PowerShell:
```powershell
Remove-Item "C:\code\one-another1\domains\approvals\components\pending-requests-card.tsx"
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npx jest domains/approvals --no-coverage
```

Expected: PASS — all existing tests still pass (no test referenced `PendingRequestsCard`).

- [ ] **Step 4: Commit**

```bash
git add domains/approvals/index.ts
git rm domains/approvals/components/pending-requests-card.tsx
git commit -m "refactor(approvals): remove PendingRequestsCard, add cancelRequestAction export"
```

---

## Task 7: Update Event Detail Page

**Files:**
- Modify: `app/(app)/(no-nav)/events/[id]/page.tsx`

- [ ] **Step 1: Remove PendingRequestsCard import**

Find and remove `PendingRequestsCard` from the `@/domains/approvals` import. The import currently reads:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
  PendingRequestsCard,
} from "@/domains/approvals";
```

Change to:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

- [ ] **Step 2: Update ApprovalMenuTrigger props**

Find:

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

Replace with:

```tsx
        <ApprovalMenuTrigger
          resourceType="EVENT"
          resourceId={id}
          resourceName={event.title}
          isAuthenticated={!!session?.user}
          hasRole={canEdit}
          myRequest={myRequest ?? null}
          pendingRequests={pendingRequests}
          isApprover={canManageStaff}
        />
```

- [ ] **Step 3: Remove PendingRequestsCard JSX**

Find and remove this block entirely:

```tsx
        {canManageStaff && (
          <PendingRequestsCard
            requests={pendingRequests}
            resourceType="EVENT"
            resourceId={id}
          />
        )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: event page errors resolved. May still see errors from series and church pages.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(no-nav)/events/[id]/page.tsx"
git commit -m "feat(approvals): update event page to use new ApprovalMenuTrigger props"
```

---

## Task 8: Update Series Detail Page

**Files:**
- Modify: `app/(app)/(no-nav)/series/[id]/page.tsx`

- [ ] **Step 1: Remove PendingRequestsCard import**

Find the `@/domains/approvals` import and remove `PendingRequestsCard`:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

- [ ] **Step 2: Update ApprovalMenuTrigger props**

Find:

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

Replace with:

```tsx
              <ApprovalMenuTrigger
                resourceType="SERIES"
                resourceId={series.id}
                resourceName={series.name}
                isAuthenticated={!!session?.user}
                hasRole={canAddSession}
                myRequest={myRequest ?? null}
                pendingRequests={pendingRequests}
                isApprover={canManageSeries}
              />
```

- [ ] **Step 3: Remove PendingRequestsCard JSX**

Find and remove:

```tsx
        {canManageSeries && (
          <PendingRequestsCard
            requests={pendingRequests}
            resourceType="SERIES"
            resourceId={series.id}
          />
        )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: series page errors resolved.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(no-nav)/series/[id]/page.tsx"
git commit -m "feat(approvals): update series page to use new ApprovalMenuTrigger props"
```

---

## Task 9: Update Church Detail Page + Final Checks

**Files:**
- Modify: `app/(app)/(no-nav)/churches/[id]/page.tsx`

- [ ] **Step 1: Remove PendingRequestsCard import**

Find the `@/domains/approvals` import and remove `PendingRequestsCard`:

```ts
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
```

- [ ] **Step 2: Update ApprovalMenuTrigger props**

Find:

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

Replace with:

```tsx
              <ApprovalMenuTrigger
                resourceType="CHURCH"
                resourceId={id}
                resourceName={church.name}
                isAuthenticated={!!session?.user}
                hasRole={canCreateEvent}
                myRequest={myRequest ?? null}
                pendingRequests={pendingRequests}
                isApprover={canManageMembers}
              />
```

- [ ] **Step 3: Remove PendingRequestsCard JSX**

Find and remove:

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

- [ ] **Step 4: Run full quality checks**

```bash
npx tsc --noEmit && echo "TS OK"
```

```bash
npm run lint 2>&1 && echo "LINT OK"
```

```bash
npm run format:check 2>&1 && echo "FORMAT OK"
```

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all pass. If format fails, run `npm run format` then re-check.

- [ ] **Step 5: Final commit**

```bash
git add "app/(app)/(no-nav)/churches/[id]/page.tsx"
git commit -m "feat(approvals): update church page to use new ApprovalMenuTrigger props"
```

---

## Self-Review

**Spec coverage:**
- ✅ `cancelRequestAction` — Task 2
- ✅ `CancelRequestSchema` — Task 1
- ✅ `deleteApprovalRequest` DAL — Task 1
- ✅ `RequestStatusDrawer` with status badge, timeline, message, cancel button — Task 3
- ✅ `ApproverRequestsDrawer` with avatar, role badge, relative time, message block, approve/deny — Task 4
- ✅ `ApprovalMenuTrigger` extended: three drawers, new props, "View my request" + "Help requests (N)" — Task 5
- ✅ `PendingRequestsCard` deleted, index.ts updated — Task 6
- ✅ All three pages updated — Tasks 7-9
- ✅ `cancelRequestAction` exported from barrel — Task 6

**Type consistency:**
- `MyRequest` interface defined identically in `approval-menu-trigger.tsx` and `request-status-drawer.tsx` — consistent
- `PendingRequest` interface defined identically in `approval-menu-trigger.tsx` and `approver-requests-drawer.tsx` — consistent
- `cancelRequestAction` takes `unknown` (consistent with other actions), parsed via `CancelRequestSchema`

**Placeholder scan:** None found. All code blocks complete.
