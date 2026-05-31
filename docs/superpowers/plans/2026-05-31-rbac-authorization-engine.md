# RBAC Authorization Engine Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hybrid sync-`can()`-plus-manual-DB-fallback authorization pattern with a single async `can(actor, capability, context)` engine that uses the DB as source of truth and React `cache()` for per-request deduplication.

**Architecture:** JWT carries identity (`id`, `isPlatformAdmin`) and church memberships (for middleware route guards and UI dropdowns only). All authorization decisions go through `await can(actor, capability, { churchId?, eventId?, seriesId? })`, which queries `ChurchMembership`, `EventStaffAssignment`, and `SeriesStaffAssignment` in parallel — each lookup memoized per-request via React `cache()`.

**Tech Stack:** Next.js 15 App Router, NextAuth v5 JWT strategy, Prisma, React `cache()`, Jest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `domains/roles/lib/can.ts` | Rewrite | New async `can()` + `Actor` + `AuthContext` types |
| `domains/roles/lib/types.ts` | Modify | Remove `RoleClaims`, `ScopeContext`; keep `RoleActionState` |
| `domains/roles/lib/session.ts` | Rewrite | `sessionToActor()` replaces `sessionToClaims()` |
| `domains/roles/lib/__tests__/can.test.ts` | Rewrite | Tests for async `can()` |
| `domains/roles/lib/__tests__/session.test.ts` | Rewrite | Tests for `sessionToActor()` |
| `domains/roles/lib/resolve-capabilities.ts` | **Delete** | Superseded by new `can()` |
| `domains/roles/lib/require-capability.ts` | **Delete** | Never used in app code |
| `domains/roles/lib/__tests__/require-capability.test.ts` | **Delete** | |
| `domains/roles/index.ts` | Modify | Update exports |
| `domains/roles/policies/event.ts` | Rewrite | Actor, remove EVENT-scope functions |
| `domains/roles/policies/church.ts` | Rewrite | Actor |
| `domains/roles/policies/series.ts` | Rewrite | Actor |
| `domains/roles/policies/__tests__/event.test.ts` | Rewrite | Async + Actor |
| `domains/roles/policies/__tests__/church.test.ts` | Rewrite | Async + Actor |
| `domains/roles/policies/__tests__/series.test.ts` | Rewrite | Async + Actor |
| `domains/events/dal/events.ts` | Modify | Actor, remove private `canForEvent` helper |
| `domains/series/dal/series.ts` | Modify | Actor |
| `domains/events/dal/__tests__/events.test.ts` | Modify | Async `can` mock |
| `domains/events/actions/crud.ts` | Modify | `sessionToActor`, pass actor to DAL |
| `domains/roles/actions/event-staff.ts` | Modify | `sessionToActor`, async `can()` |
| `domains/roles/actions/series-staff.ts` | Modify | `sessionToActor`, async `can()` |
| `domains/roles/actions/church-memberships.ts` | Modify | `sessionToActor`, async policy |
| `domains/roles/actions/platform-roles.ts` | Modify | `sessionToActor` |
| `domains/admin/actions/admin.ts` | Modify | `sessionToActor`, async policy |
| `domains/upload/actions/upload.ts` | Modify | Use session directly (no claims) |
| `domains/events/actions/__tests__/events.test.ts` | Modify | Async `can` mock, `sessionToActor` |
| `domains/roles/actions/__tests__/event-staff.test.ts` | Modify | Async `can` mock |
| `domains/roles/actions/__tests__/series-staff.test.ts` | Modify | `sessionToActor` mock |
| `domains/roles/actions/__tests__/church-memberships.test.ts` | Modify | `sessionToActor` mock, async policy |
| `domains/roles/actions/__tests__/platform-roles.test.ts` | Modify | `sessionToActor` mock |
| `domains/admin/actions/__tests__/admin.test.ts` | Modify | `sessionToActor` mock, async policy |
| `domains/series/actions/__tests__/series.test.ts` | Modify | Async `can` mock |
| `app/(app)/(no-nav)/events/[id]/page.tsx` | Modify | Actor, `await can()` |
| `app/(app)/(no-nav)/events/[id]/edit/page.tsx` | Modify | Actor, `await can()` |
| `app/(app)/(no-nav)/events/[id]/responses/page.tsx` | Modify | Actor, `await can()` |
| `app/(app)/(no-nav)/series/[id]/page.tsx` | Modify | Actor, `await can()` |
| `app/(app)/(no-nav)/series/[id]/edit/page.tsx` | Modify | Actor, `await can()` |

---

## Task 1: Core — rewrite `can.ts`, slim `types.ts`

**Files:**
- Rewrite: `domains/roles/lib/can.ts`
- Modify: `domains/roles/lib/types.ts`

- [ ] **Step 1: Write the failing tests**

Replace entire `domains/roles/lib/__tests__/can.test.ts` with:

```ts
jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { can, type Actor } from "../can";
import { Capabilities } from "../capabilities";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const mockEvent = prisma.eventStaffAssignment.findUnique as jest.Mock;
const mockSeries = prisma.seriesStaffAssignment.findUnique as jest.Mock;

const admin: Actor = { id: "a1", isPlatformAdmin: true };
const user: Actor = { id: "u1", isPlatformAdmin: false };

beforeEach(() => jest.clearAllMocks());

describe("platform admin", () => {
  it("returns true for any capability without DB call", async () => {
    expect(await can(admin, Capabilities.EVENT_CREATE, {})).toBe(true);
    expect(mockChurch).not.toHaveBeenCalled();
  });
});

describe("empty context", () => {
  it("returns false when no context fields provided", async () => {
    expect(await can(user, Capabilities.EVENT_CREATE, {})).toBe(false);
  });
});

describe("church membership", () => {
  it("true: CHURCH_ADMIN checks church:manage", async () => {
    mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
    expect(await can(user, Capabilities.CHURCH_MANAGE, { churchId: "c1" })).toBe(true);
  });
  it("true: EVENT_MANAGER checks event:update", async () => {
    mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1" })).toBe(true);
  });
  it("false: EVENT_CREATOR checks event:update", async () => {
    mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1" })).toBe(false);
  });
  it("false: no membership", async () => {
    mockChurch.mockResolvedValue(null);
    expect(await can(user, Capabilities.EVENT_CREATE, { churchId: "c1" })).toBe(false);
  });
});

describe("event staff", () => {
  it("true: EVENT_MANAGER staff checks event:update", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { eventId: "e1" })).toBe(true);
  });
  it("true: EVENT_MANAGER staff checks event:view_attendees", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_VIEW_ATTENDEES, { eventId: "e1" })).toBe(true);
  });
  it("false: EVENT_EDITOR staff checks event:manage_staff", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_EDITOR" });
    expect(await can(user, Capabilities.EVENT_MANAGE_STAFF, { eventId: "e1" })).toBe(false);
  });
  it("false: no event staff row", async () => {
    mockEvent.mockResolvedValue(null);
    expect(await can(user, Capabilities.EVENT_UPDATE, { eventId: "e1" })).toBe(false);
  });
});

describe("series staff", () => {
  it("true: SERIES_MANAGER checks series:update", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(await can(user, Capabilities.SERIES_UPDATE, { seriesId: "s1" })).toBe(true);
  });
  it("true: SERIES_MANAGER checks event:create", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(await can(user, Capabilities.EVENT_CREATE, { seriesId: "s1" })).toBe(true);
  });
  it("false: SERIES_SESSION_CREATOR checks series:update", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_SESSION_CREATOR" });
    expect(await can(user, Capabilities.SERIES_UPDATE, { seriesId: "s1" })).toBe(false);
  });
});

describe("combined context", () => {
  it("true via event staff when church membership missing", async () => {
    mockChurch.mockResolvedValue(null);
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(
      await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1", eventId: "e1" })
    ).toBe(true);
  });
  it("runs all provided context checks in parallel", async () => {
    mockChurch.mockResolvedValue(null);
    mockEvent.mockResolvedValue(null);
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(
      await can(user, Capabilities.EVENT_CREATE, {
        churchId: "c1",
        eventId: "e1",
        seriesId: "s1",
      })
    ).toBe(true);
    expect(mockChurch).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockSeries).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx jest domains/roles/lib/__tests__/can.test.ts
```

Expected: multiple failures ("can is not async", type errors)

- [ ] **Step 3: Rewrite `domains/roles/lib/can.ts`**

```ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  CHURCH_ROLE_CAPABILITIES,
  EVENT_ROLE_CAPABILITIES,
  SERIES_ROLE_CAPABILITIES,
} from "./roles";
import type { Capability } from "./capabilities";

export interface Actor {
  id: string;
  isPlatformAdmin: boolean;
}

export type AuthContext = {
  churchId?: string;
  eventId?: string;
  seriesId?: string;
};

const getChurchMembership = cache((userId: string, churchId: string) =>
  prisma.churchMembership.findUnique({
    where: { userId_churchId: { userId, churchId } },
    select: { role: true },
  })
);

const getEventStaff = cache((userId: string, eventId: string) =>
  prisma.eventStaffAssignment.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { role: true },
  })
);

const getSeriesStaff = cache((userId: string, seriesId: string) =>
  prisma.seriesStaffAssignment.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
    select: { role: true },
  })
);

export async function can(
  actor: Actor,
  capability: Capability,
  context: AuthContext
): Promise<boolean> {
  if (actor.isPlatformAdmin) return true;

  const checks: Promise<boolean>[] = [];

  if (context.churchId) {
    checks.push(
      getChurchMembership(actor.id, context.churchId).then(
        (m) =>
          !!m &&
          (CHURCH_ROLE_CAPABILITIES[m.role] as string[]).includes(capability)
      )
    );
  }

  if (context.eventId) {
    checks.push(
      getEventStaff(actor.id, context.eventId).then(
        (s) =>
          !!s &&
          (EVENT_ROLE_CAPABILITIES[s.role] as string[]).includes(capability)
      )
    );
  }

  if (context.seriesId) {
    checks.push(
      getSeriesStaff(actor.id, context.seriesId).then(
        (s) =>
          !!s &&
          (SERIES_ROLE_CAPABILITIES[s.role] as string[]).includes(capability)
      )
    );
  }

  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some(Boolean);
}
```

- [ ] **Step 4: Update `domains/roles/lib/types.ts`** — remove `RoleClaims` and `ScopeContext`, keep only `RoleActionState`:

```ts
export interface RoleActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx jest domains/roles/lib/__tests__/can.test.ts
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add domains/roles/lib/can.ts domains/roles/lib/types.ts domains/roles/lib/__tests__/can.test.ts
git commit -m "refactor(rbac): async can() — DB-backed authorization engine with React cache"
```

---

## Task 2: Session helper — `sessionToActor`

**Files:**
- Rewrite: `domains/roles/lib/session.ts`
- Rewrite: `domains/roles/lib/__tests__/session.test.ts`

- [ ] **Step 1: Rewrite `domains/roles/lib/session.ts`**

```ts
import "server-only";
import type { Session } from "next-auth";
import type { Actor } from "./can";

export function sessionToActor(session: Session | null): Actor | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    isPlatformAdmin: session.user.isPlatformAdmin ?? false,
  };
}
```

- [ ] **Step 2: Rewrite `domains/roles/lib/__tests__/session.test.ts`**

```ts
import { sessionToActor } from "../session";

const makeSession = (overrides: object) => ({
  user: { id: "u1", isPlatformAdmin: false, churchMemberships: [], ...overrides },
  expires: "2099-01-01",
});

describe("sessionToActor", () => {
  it("returns null for null session", () => {
    expect(sessionToActor(null)).toBeNull();
  });

  it("returns Actor with id and isPlatformAdmin", () => {
    expect(sessionToActor(makeSession({ id: "u1", isPlatformAdmin: true }) as any)).toEqual({
      id: "u1",
      isPlatformAdmin: true,
    });
  });

  it("defaults isPlatformAdmin to false when undefined", () => {
    expect(
      sessionToActor(makeSession({ id: "u2", isPlatformAdmin: undefined }) as any)
    ).toEqual({ id: "u2", isPlatformAdmin: false });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx jest domains/roles/lib/__tests__/session.test.ts
```

Expected: 3 pass

- [ ] **Step 4: Commit**

```bash
git add domains/roles/lib/session.ts domains/roles/lib/__tests__/session.test.ts
git commit -m "refactor(rbac): sessionToActor replaces sessionToClaims"
```

---

## Task 3: Update policies — Actor + async

**Files:**
- Rewrite: `domains/roles/policies/event.ts`
- Rewrite: `domains/roles/policies/church.ts`
- Rewrite: `domains/roles/policies/series.ts`
- Rewrite: `domains/roles/policies/__tests__/event.test.ts`
- Rewrite: `domains/roles/policies/__tests__/church.test.ts`
- Rewrite: `domains/roles/policies/__tests__/series.test.ts`

- [ ] **Step 1: Rewrite `domains/roles/policies/event.ts`**

Remove `canEdit`, `canManageStaff`, `canViewAttendees`, `canScanAttendees` (all used broken EVENT scope). Keep `canCreate`, `canPublish`, `canDelete` — update to `Actor`:

```ts
import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { Actor } from "../lib/can";

export const eventPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_CREATE, { churchId }),
  canPublish: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_PUBLISH, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_DELETE, { churchId }),
};
```

- [ ] **Step 2: Rewrite `domains/roles/policies/church.ts`**

```ts
import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { Actor } from "../lib/can";

export const churchPolicy = {
  canManage: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.CHURCH_MANAGE, { churchId }),
  canManageMembers: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId }),
};
```

- [ ] **Step 3: Rewrite `domains/roles/policies/series.ts`**

```ts
import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { Actor } from "../lib/can";

export const seriesPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_CREATE, { churchId }),
  canUpdate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_UPDATE, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_DELETE, { churchId }),
  canAddSession: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_CREATE, { churchId }),
};
```

- [ ] **Step 4: Rewrite `domains/roles/policies/__tests__/event.test.ts`**

```ts
jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { eventPolicy } from "../event";
import type { Actor } from "../../lib/can";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const manager: Actor = { id: "u1", isPlatformAdmin: false };
const admin: Actor = { id: "u2", isPlatformAdmin: true };

beforeEach(() => jest.clearAllMocks());

describe("eventPolicy", () => {
  describe("canCreate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(true);
    });
    it("true for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(true);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(false);
    });
    it("true for platform admin (no DB call)", async () => {
      expect(await eventPolicy.canCreate(admin, "any")).toBe(true);
      expect(mockChurch).not.toHaveBeenCalled();
    });
  });

  describe("canPublish", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canPublish(manager, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canPublish(manager, "c1")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canDelete(manager, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canDelete(manager, "c1")).toBe(false);
    });
  });
});
```

- [ ] **Step 5: Rewrite `domains/roles/policies/__tests__/church.test.ts`**

```ts
jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { churchPolicy } from "../church";
import type { Actor } from "../../lib/can";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const user: Actor = { id: "u1", isPlatformAdmin: false };

beforeEach(() => jest.clearAllMocks());

describe("churchPolicy", () => {
  describe("canManageMembers", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(true);
    });
    it("false for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(false);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(false);
    });
  });

  describe("canManage", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await churchPolicy.canManage(user, "c1")).toBe(true);
    });
    it("false for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await churchPolicy.canManage(user, "c1")).toBe(false);
    });
  });
});
```

- [ ] **Step 6: Rewrite `domains/roles/policies/__tests__/series.test.ts`**

```ts
jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { seriesPolicy } from "../series";
import type { Actor } from "../../lib/can";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const user: Actor = { id: "u1", isPlatformAdmin: false };

beforeEach(() => jest.clearAllMocks());

describe("seriesPolicy", () => {
  describe("canCreate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(false);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(false);
    });
  });

  describe("canUpdate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canUpdate(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canUpdate(user, "c1")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await seriesPolicy.canDelete(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canDelete(user, "c1")).toBe(false);
    });
  });

  describe("canAddSession", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(true);
    });
    it("true for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(true);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(false);
    });
  });
});
```

- [ ] **Step 7: Run policy tests**

```bash
npx jest domains/roles/policies/__tests__
```

Expected: all pass

- [ ] **Step 8: Commit**

```bash
git add domains/roles/policies/event.ts domains/roles/policies/church.ts domains/roles/policies/series.ts domains/roles/policies/__tests__/event.test.ts domains/roles/policies/__tests__/church.test.ts domains/roles/policies/__tests__/series.test.ts
git commit -m "refactor(rbac): policies use Actor + async can()"
```

---

## Task 4: Events DAL

**Files:**
- Modify: `domains/events/dal/events.ts`
- Modify: `domains/events/dal/__tests__/events.test.ts`

- [ ] **Step 1: Update `domains/events/dal/events.ts`**

Remove the import of `RoleClaims`. Add `Actor` import. Remove the private `canForEvent` helper function (lines 81–118). Update every exported function signature from `claims: RoleClaims` to `actor: Actor`. Update every auth call.

Replace the file imports section:
```ts
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { EVENT_ROLE_CAPABILITIES, SERIES_ROLE_CAPABILITIES } from "@/domains/roles/lib/roles";
import type { Actor } from "@/domains/roles/lib/can";
```

Remove the `RoleClaims` import and the entire `canForEvent` function.

Update `createEvent` signature and auth:
```ts
export async function createEvent(
  data: CreateEventInput,
  userId: string,
  actor: Actor
): Promise<...> {
  // ...existing field extraction...

  // Auth check (replaces old can() + seriesStaff fallback):
  const allowed = await can(actor, Capabilities.EVENT_CREATE, {
    churchId,
    seriesId: seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };

  // ...existing prisma.event.create...

  // Auto-assign EVENT_EDITOR for users without church-level event:update
  const hasChurchUpdateAccess = await can(actor, Capabilities.EVENT_UPDATE, { churchId });
  if (!hasChurchUpdateAccess) {
    await prisma.eventStaffAssignment.create({
      data: { userId, eventId: created.id, role: "EVENT_EDITOR", assignedBy: userId },
    });
  }

  // ...rest unchanged...
}
```

Update `updateEvent` signature and auth:
```ts
export async function updateEvent(
  id: string,
  data: CreateEventInput,
  userId: string,
  actor: Actor
): Promise<...> {
  // ...existing field extraction...

  const allowedOriginal = await can(actor, Capabilities.EVENT_UPDATE, {
    churchId: existing.churchId,
    eventId: id,
    seriesId: existing.seriesId ?? undefined,
  });
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await can(actor, Capabilities.EVENT_UPDATE, { churchId });
    if (!allowedNew) return { error: "Unauthorised." };
  }
  // ...rest unchanged...
}
```

Update `cancelEvent`, `uncancelEvent` signatures and auth:
```ts
export async function cancelEvent(
  id: string,
  reason: string,
  userId: string,
  actor: Actor
): Promise<...> {
  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true, title: true, seriesId: true } });
  if (!event) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_UPDATE, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };
  // ...rest unchanged...
}

export async function uncancelEvent(
  id: string,
  userId: string,
  actor: Actor
): Promise<...> {
  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true, seriesId: true } });
  if (!event) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_UPDATE, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };
  // ...rest unchanged...
}
```

Update `publishEvent`, `unpublishEvent`, `deleteEvent`:
```ts
export async function publishEvent(id: string, userId: string, actor: Actor) {
  // ...
  const allowed = await can(actor, Capabilities.EVENT_PUBLISH, { churchId: event.churchId });
  if (!allowed) return { error: "You are not assigned to this church." };
  // ...rest unchanged...
}

export async function unpublishEvent(id: string, userId: string, actor: Actor) {
  // ...
  const allowed = await can(actor, Capabilities.EVENT_PUBLISH, { churchId: event.churchId });
  if (!allowed) return { error: "You are not assigned to this church." };
  // ...rest unchanged...
}

export async function deleteEvent(id: string, userId: string, actor: Actor) {
  // ...
  const allowed = await can(actor, Capabilities.EVENT_DELETE, { churchId: event.churchId });
  if (!allowed) return { error: "Unauthorised." };
  // ...rest unchanged...
}
```

- [ ] **Step 2: Update mock in `domains/events/dal/__tests__/events.test.ts`**

Change the `can` mock from sync to async:

```ts
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
```

Also update the mock type reference from `RoleClaims` to `Actor` wherever it appears in test fixtures. The `publishEvent` and `cancelEvent` test calls pass `claims` — update those to pass `actor: { id: "user-1", isPlatformAdmin: false }`.

- [ ] **Step 3: Run DAL tests**

```bash
npx jest domains/events/dal/__tests__/events.test.ts
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add domains/events/dal/events.ts domains/events/dal/__tests__/events.test.ts
git commit -m "refactor(rbac): events DAL uses Actor + async can()"
```

---

## Task 5: Series DAL

**Files:**
- Modify: `domains/series/dal/series.ts`

- [ ] **Step 1: Update `domains/series/dal/series.ts`**

Replace `RoleClaims` import with `Actor`. Update both function signatures and auth calls.

Replace imports:
```ts
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import type { Actor } from "@/domains/roles/lib/can";
```

Remove `RoleClaims` import.

Update `createSeries`:
```ts
export async function createSeries(
  data: CreateSeriesInput,
  userId: string,
  actor: Actor
): Promise<DalError | { id: string; churchId: string }> {
  // ...existing field extraction...
  const allowed = await can(actor, Capabilities.SERIES_CREATE, { churchId });
  if (!allowed) return { error: "Unauthorised." };
  // ...rest unchanged...
}
```

Update `updateSeries` — replace two-step pattern:
```ts
export async function updateSeries(
  id: string,
  data: CreateSeriesInput,
  userId: string,
  actor: Actor
): Promise<DalError | { oldChurchId: string; newChurchId: string }> {
  // ...existing field extraction...
  const existing = await prisma.series.findUnique({ where: { id }, select: { churchId: true } });
  if (!existing) return { error: "Series not found." };

  const allowedOriginal = await can(actor, Capabilities.SERIES_UPDATE, {
    churchId: existing.churchId,
    seriesId: id,
  });
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await can(actor, Capabilities.SERIES_UPDATE, { churchId });
    if (!allowedNew) return { error: "Unauthorised." };
  }
  // ...rest unchanged...
}
```

- [ ] **Step 2: Run series DAL tests (via series actions which test through the DAL)**

```bash
npx jest domains/series
```

Expected: TypeScript errors visible but tests run — fix any type errors

- [ ] **Step 3: Commit**

```bash
git add domains/series/dal/series.ts
git commit -m "refactor(rbac): series DAL uses Actor + async can()"
```

---

## Task 6: Event actions

**Files:**
- Modify: `domains/events/actions/crud.ts`
- Modify: `domains/events/actions/__tests__/events.test.ts`

- [ ] **Step 1: Update `domains/events/actions/crud.ts`**

Replace `sessionToClaims` with `sessionToActor` throughout. Pass `actor` (not `claims`) to all DAL calls.

Replace import:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
```

In each action function, change:
```ts
// Old
const claims = sessionToClaims(session);
if (!claims) return { error: "Unauthorised." };
// ...
const result = await createEvent(parsed.data, session.user.id, claims);

// New
const actor = sessionToActor(session);
if (!actor) return { error: "Unauthorised." };
// ...
const result = await createEvent(parsed.data, session.user.id, actor);
```

Apply to all actions: `createEventAction`, `updateEventAction`, `cancelEventAction`, `uncancelEventAction`, `publishEventAction`, `unpublishEventAction`, `deleteEventAction`.

For actions that use `redirect("/")` on no session (not return), the pattern is:
```ts
const actor = sessionToActor(session);
if (!actor) redirect("/");
```

- [ ] **Step 2: Update `domains/events/actions/__tests__/events.test.ts`**

Change the `can` mock to async:
```ts
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
```

Change the `sessionToClaims` mock to `sessionToActor`:
```ts
// Remove any sessionToClaims mock — crud.ts now imports sessionToActor from session.ts
// The auth mock on session.user already provides what's needed since sessionToActor
// reads session.user.id and session.user.isPlatformAdmin directly
```

Update `mockCan` reference:
```ts
const mockCan = jest.requireMock("@/domains/roles/lib/can").can as jest.Mock;
// Change mockCan.mockReturnValue(true) → mockCan.mockResolvedValue(true)
// Change mockCan.mockReturnValueOnce(true) → mockCan.mockResolvedValueOnce(true)
```

The `beforeEach` setup:
```ts
mockCan.mockResolvedValue(true);
```

All `mockCanManageFromClaims` references are already gone (changed in a prior commit). For `mockCan.mockReturnValueOnce(true).mockReturnValueOnce(false)` patterns — change to `mockResolvedValueOnce`.

- [ ] **Step 3: Run event action tests**

```bash
npx jest domains/events/actions/__tests__/events.test.ts
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add domains/events/actions/crud.ts domains/events/actions/__tests__/events.test.ts
git commit -m "refactor(rbac): event actions use sessionToActor + Actor"
```

---

## Task 7: Roles actions

**Files:**
- Modify: `domains/roles/actions/event-staff.ts`
- Modify: `domains/roles/actions/series-staff.ts`
- Modify: `domains/roles/actions/church-memberships.ts`
- Modify: `domains/roles/actions/platform-roles.ts`
- Modify: `domains/roles/actions/__tests__/event-staff.test.ts`
- Modify: `domains/roles/actions/__tests__/series-staff.test.ts`
- Modify: `domains/roles/actions/__tests__/church-memberships.test.ts`
- Modify: `domains/roles/actions/__tests__/platform-roles.test.ts`

- [ ] **Step 1: Update `domains/roles/actions/event-staff.ts`**

Replace `sessionToClaims` with `sessionToActor`. The church-level check in `assignEventRoleAction` and `removeEventStaffAction` currently does `can(claims, EVENT_MANAGE_STAFF, { scope: "CHURCH", churchId })` then checks event staff if false. With the new `can()`, pass both `churchId` and `eventId`:

```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import type { Actor } from "@/domains/roles/lib/can";

// Remove sessionToClaims import

export async function assignEventRoleAction(input: unknown): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const parsed = AssignEventRoleSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, role } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
    churchId,
    eventId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await upsertEventStaff(userId, eventId, role, session.user.id);
  return { success: "Staff role assigned." };
}

export async function removeEventStaffAction(input: unknown): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const parsed = RemoveEventStaffSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
    churchId,
    eventId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await removeEventStaff(userId, eventId);
  return { success: "Staff removed." };
}
```

Remove the `prisma.eventStaffAssignment.findUnique` fallback — the new `can()` handles event staff DB lookup internally.

- [ ] **Step 2: Update `domains/roles/actions/series-staff.ts`**

Replace `sessionToClaims` with `sessionToActor`. Replace `can(claims, ...)` with `await can(actor, ...)`:

```ts
import { sessionToActor } from "@/domains/roles/lib/session";

// In assignSeriesRoleAction and removeSeriesStaffAction:
const actor = sessionToActor(session);
if (!actor) return { error: "Unauthorised." };

// Auth check (series has churchId from DB lookup):
const allowed = await can(actor, Capabilities.SERIES_UPDATE, { churchId: series.churchId });
if (!allowed) return { error: "Unauthorised." };
```

- [ ] **Step 3: Update `domains/roles/actions/church-memberships.ts`**

```ts
import { sessionToActor } from "@/domains/roles/lib/session";

// Replace sessionToClaims → sessionToActor
// churchPolicy.canManageMembers is now async:
const actor = sessionToActor(session);
if (!actor) return { error: "Unauthorised." };

if (!await churchPolicy.canManageMembers(actor, churchId))
  return { error: "Unauthorised." };
```

- [ ] **Step 4: Update `domains/roles/actions/platform-roles.ts`**

```ts
import { sessionToActor } from "@/domains/roles/lib/session";

// Replace sessionToClaims → sessionToActor
// isPlatformAdmin check stays the same (reads from actor):
const actor = sessionToActor(session);
if (!actor) return { error: "Unauthorised." };
if (!actor.isPlatformAdmin) return { error: "Unauthorised." };
```

- [ ] **Step 5: Update `domains/roles/actions/__tests__/event-staff.test.ts`**

The test previously mocked `can` (sync) + `prisma.eventStaffAssignment.findUnique` as fallback. Now `can` is async and handles the fallback internally. Remove the `prisma.eventStaffAssignment.findUnique` setup and simplify:

```ts
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToActor: jest.fn(),
}));

// Remove eventStaffAssignment findUnique mock from prisma mock

const mockCan = jest.requireMock("@/domains/roles/lib/can").can as jest.Mock;
const mockSessionToActor = jest.requireMock("@/domains/roles/lib/session").sessionToActor as jest.Mock;

// In beforeEach:
mockCan.mockResolvedValue(true);
mockSessionToActor.mockReturnValue({ id: "admin-1", isPlatformAdmin: false });

// Test cases:
// "church-level EVENT_MANAGER → succeeds" → mockCan.mockResolvedValue(true)
// "no access → denied" → mockCan.mockResolvedValue(false)
// Remove "event-level EVENT_MANAGER staff → succeeds" test (now internal to can())
// Replace with: "denied when can() returns false" test
```

Rewrite all test cases to use `mockSessionToActor` instead of `mockSessionToClaims`, and `mockCan.mockResolvedValue` instead of `mockCan.mockReturnValue`.

- [ ] **Step 6: Update `domains/roles/actions/__tests__/series-staff.test.ts`**

```ts
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToActor: jest.fn(),
}));

// Replace all sessionToClaims references with sessionToActor
// Replace claims fixtures ({ isPlatformAdmin, churchMemberships }) with actor fixtures:
const validActor = { id: "admin-1", isPlatformAdmin: false };
const adminActor = { id: "admin-1", isPlatformAdmin: true };

// In tests, mock can() for the authorization check:
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
```

- [ ] **Step 7: Update `domains/roles/actions/__tests__/church-memberships.test.ts`**

```ts
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToActor: jest.fn(),
}));
jest.mock("@/domains/roles/policies/church", () => ({
  churchPolicy: { canManageMembers: jest.fn().mockResolvedValue(true) },
}));

// Replace sessionToClaims → sessionToActor
// Replace validClaims with: { id: "admin-1", isPlatformAdmin: false }
// churchPolicy.canManageMembers is now async: mockCanManageMembers.mockResolvedValue(true/false)
```

- [ ] **Step 8: Update `domains/roles/actions/__tests__/platform-roles.test.ts`**

```ts
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToActor: jest.fn(),
}));

// Replace sessionToClaims → sessionToActor
// Actor fixture: { id: "admin-1", isPlatformAdmin: true/false }
// The isPlatformAdmin check in the action reads from actor directly (no can() call)
```

- [ ] **Step 9: Run all roles action tests**

```bash
npx jest domains/roles/actions/__tests__
```

Expected: all pass

- [ ] **Step 10: Commit**

```bash
git add domains/roles/actions/event-staff.ts domains/roles/actions/series-staff.ts domains/roles/actions/church-memberships.ts domains/roles/actions/platform-roles.ts domains/roles/actions/__tests__/event-staff.test.ts domains/roles/actions/__tests__/series-staff.test.ts domains/roles/actions/__tests__/church-memberships.test.ts domains/roles/actions/__tests__/platform-roles.test.ts
git commit -m "refactor(rbac): roles actions use sessionToActor + async can()"
```

---

## Task 8: Admin + upload actions

**Files:**
- Modify: `domains/admin/actions/admin.ts`
- Modify: `domains/admin/actions/__tests__/admin.test.ts`
- Modify: `domains/upload/actions/upload.ts`

- [ ] **Step 1: Update `domains/admin/actions/admin.ts`**

```ts
import { sessionToActor } from "@/domains/roles/lib/session";
// Remove sessionToClaims import

// In addOrganiserToChurchAction and removeOrganiserFromChurchAction:
const actor = sessionToActor(session);
if (!actor) return { error: "Unauthorised." };

if (!await churchPolicy.canManageMembers(actor, churchId))
  return { error: "Unauthorised." };
```

- [ ] **Step 2: Update `domains/admin/actions/__tests__/admin.test.ts`**

```ts
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToActor: jest.fn(),
}));
jest.mock("@/domains/roles/policies/church", () => ({
  churchPolicy: { canManageMembers: jest.fn().mockResolvedValue(true) },
}));

// Replace all sessionToClaims references with sessionToActor
// Replace defaultClaims with: { id: "admin-1", isPlatformAdmin: false }
// mockCanManageMembers.mockResolvedValue(true/false) — note: async now
```

- [ ] **Step 3: Update `domains/upload/actions/upload.ts`**

This action does a coarse "is this user any kind of organiser?" check. Use session directly — no `can()` needed since it's a UI-level gate:

```ts
export async function deleteUploadedFileAction(url: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (
    !session.user.isPlatformAdmin &&
    (session.user.churchMemberships ?? []).length === 0
  )
    return;

  // ...rest of URL validation and del() unchanged...
}
```

Remove `sessionToClaims` import entirely.

- [ ] **Step 4: Run admin and upload tests**

```bash
npx jest domains/admin/actions/__tests__/admin.test.ts
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add domains/admin/actions/admin.ts domains/admin/actions/__tests__/admin.test.ts domains/upload/actions/upload.ts
git commit -m "refactor(rbac): admin and upload actions use sessionToActor"
```

---

## Task 9: Series actions test

**Files:**
- Modify: `domains/series/actions/__tests__/series.test.ts`

- [ ] **Step 1: Update `can` mock to async**

In `domains/series/actions/__tests__/series.test.ts`, change:
```ts
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),  // was mockReturnValue
}));
```

Update `mockCan` usages:
```ts
mockCan.mockResolvedValue(true);  // in beforeEach
mockCan.mockResolvedValue(false);  // in unauthorized tests
mockCan.mockResolvedValueOnce(true).mockResolvedValueOnce(false);  // church-change test
```

- [ ] **Step 2: Run series action tests**

```bash
npx jest domains/series/actions/__tests__/series.test.ts
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add domains/series/actions/__tests__/series.test.ts
git commit -m "refactor(rbac): series action tests updated for async can()"
```

---

## Task 10: Event pages

**Files:**
- Modify: `app/(app)/(no-nav)/events/[id]/page.tsx`
- Modify: `app/(app)/(no-nav)/events/[id]/edit/page.tsx`
- Modify: `app/(app)/(no-nav)/events/[id]/responses/page.tsx`

- [ ] **Step 1: Update `app/(app)/(no-nav)/events/[id]/page.tsx`**

Replace imports:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
// Remove: getEventStaffForUser (no longer needed in page)
```

Replace the authorization block (after `const isAttending = ...`):
```ts
const actor = sessionToActor(session);
const churchId = event.churchId ?? "";

const [canEdit, canDelete, canViewAttendees] = actor
  ? await Promise.all([
      can(actor, Capabilities.EVENT_UPDATE, { churchId, eventId: id }),
      can(actor, Capabilities.EVENT_DELETE, { churchId }),
      can(actor, Capabilities.EVENT_VIEW_ATTENDEES, { churchId, eventId: id }),
    ])
  : [false, false, false];
```

Remove `canEditFromChurch`, `canDeleteFromChurch`, `canViewAttendeesFromChurch`, `eventStaff` variables.

In `generateMetadata`, replace the draft check:
```ts
const actor = sessionToActor(session);
if (
  !actor ||
  !await can(actor, Capabilities.EVENT_UPDATE, { churchId: event.churchId ?? "" })
)
  return { title: "Event Not Found" };
```

Remove `getEventStaffForUser` import.

- [ ] **Step 2: Update `app/(app)/(no-nav)/events/[id]/responses/page.tsx`**

Replace imports:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
// Remove: getEventStaffForUser
```

Replace auth block:
```ts
const actor = sessionToActor(session);
const canViewAttendees =
  !!actor &&
  (await can(actor, Capabilities.EVENT_VIEW_ATTENDEES, {
    churchId: event.churchId ?? "",
    eventId: id,
  }));

if (!canViewAttendees) redirect(`/events/${id}`);
```

- [ ] **Step 3: Update `app/(app)/(no-nav)/events/[id]/edit/page.tsx`**

Replace imports:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
// Remove: getEventStaffForUser
```

Replace auth block. Keep JWT memberships for dropdown UI, use `can()` for the actual access check:

```ts
const actor = sessionToActor(session);

// Access check — can this user edit this specific event?
const canAccess =
  !!actor &&
  (await can(actor, Capabilities.EVENT_UPDATE, {
    churchId: event.churchId ?? "",
    eventId: id,
  }));
if (!canAccess) notFound();

// UI: which churches to show in the church-change dropdown
// Use JWT memberships (acceptable slight staleness for UI only)
const churchMemberships = session.user.churchMemberships ?? [];
const editableChurchIds = churchMemberships
  .filter((m) => m.role === "CHURCH_ADMIN" || m.role === "EVENT_MANAGER")
  .map((m) => m.churchId);

const [churches, questions, libraryItems, questionsLocked] = await Promise.all([
  editableChurchIds.length > 0
    ? getChurchesByIds(editableChurchIds)
    : event.church
      ? Promise.resolve([event.church])
      : Promise.resolve([]),
  getEventQuestions(id),
  getQuestionLibraryForUser(session.user.id),
  hasEventResponses(id),
]);
```

Remove `sessionToClaims`, `editableChurchIds` filter logic that called `can()` per membership, and `getEventStaffForUser` import.

- [ ] **Step 4: Run type check on event pages**

```bash
npx tsc --noEmit
```

Fix any type errors before committing.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(no-nav)/events/[id]/page.tsx" "app/(app)/(no-nav)/events/[id]/edit/page.tsx" "app/(app)/(no-nav)/events/[id]/responses/page.tsx"
git commit -m "refactor(rbac): event pages use sessionToActor + await can()"
```

---

## Task 11: Series pages

**Files:**
- Modify: `app/(app)/(no-nav)/series/[id]/page.tsx`
- Modify: `app/(app)/(no-nav)/series/[id]/edit/page.tsx`

- [ ] **Step 1: Update `app/(app)/(no-nav)/series/[id]/page.tsx`**

Replace imports:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
// Remove: seriesPolicy, eventPolicy, getSeriesStaffForUser
```

Replace authorization block:
```ts
const actor = sessionToActor(session);
const [canEdit, canDelete, canAddSession] = actor
  ? await Promise.all([
      can(actor, Capabilities.SERIES_UPDATE, {
        churchId: series.churchId,
        seriesId: series.id,
      }),
      can(actor, Capabilities.SERIES_DELETE, { churchId: series.churchId }),
      can(actor, Capabilities.EVENT_CREATE, {
        churchId: series.churchId,
        seriesId: series.id,
      }),
    ])
  : [false, false, false];
```

Remove `canEditFromChurch`, `canDelete`, `canAddSessionFromChurch`, `seriesStaff` variables.

- [ ] **Step 2: Update `app/(app)/(no-nav)/series/[id]/edit/page.tsx`**

Replace imports:
```ts
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
// Remove: seriesPolicy, getSeriesStaffForUser
```

Replace auth block:
```ts
const actor = sessionToActor(session);
const canAccess =
  !!actor &&
  (await can(actor, Capabilities.SERIES_UPDATE, {
    churchId: series.churchId,
    seriesId: series.id,
  }));
if (!canAccess) notFound();

// UI: church dropdown — filter by series:update capability using JWT memberships
const churchMemberships = session.user.churchMemberships ?? [];
const editableChurchIds = churchMemberships
  .filter((m) => m.role === "CHURCH_ADMIN" || m.role === "EVENT_MANAGER")
  .map((m) => m.churchId);

let churches = await getChurchesByIds(editableChurchIds);
if (!churches.some((c) => c.id === series.churchId)) {
  if (series.church) churches = [series.church];
  else notFound();
}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(no-nav)/series/[id]/page.tsx" "app/(app)/(no-nav)/series/[id]/edit/page.tsx"
git commit -m "refactor(rbac): series pages use sessionToActor + await can()"
```

---

## Task 12: Cleanup + update index exports

**Files:**
- Delete: `domains/roles/lib/resolve-capabilities.ts`
- Delete: `domains/roles/lib/require-capability.ts`
- Delete: `domains/roles/lib/__tests__/require-capability.test.ts`
- Modify: `domains/roles/index.ts`

- [ ] **Step 1: Delete dead files**

```bash
rm domains/roles/lib/resolve-capabilities.ts
rm domains/roles/lib/require-capability.ts
rm domains/roles/lib/__tests__/require-capability.test.ts
```

- [ ] **Step 2: Update `domains/roles/index.ts`**

```ts
// Actions
export * from "./actions/church-memberships";
export * from "./actions/event-staff";
export * from "./actions/series-staff";
export * from "./actions/platform-roles";

// Validations + inferred types
export * from "./validations/roles";

// Policies
export { eventPolicy } from "./policies/event";
export { churchPolicy } from "./policies/church";
export { seriesPolicy } from "./policies/series";

// Core permission API
export { can } from "./lib/can";
export { sessionToActor } from "./lib/session";
export { Capabilities } from "./lib/capabilities";
export type { Capability } from "./lib/capabilities";
export type { Actor, AuthContext } from "./lib/can";
export type { RoleActionState } from "./lib/types";
```

- [ ] **Step 3: Run full type check**

```bash
npx tsc --noEmit
```

Expected: clean. Fix any remaining references to `RoleClaims`, `ScopeContext`, `sessionToClaims`, `requireCapability`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(rbac): remove dead resolve-capabilities, require-capability; update index exports"
```

---

## Task 13: Full quality gate + final commit

- [ ] **Step 1: Run full test suite**

```bash
npx jest
```

Expected: all suites pass

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: clean

- [ ] **Step 3: Run linter**

```bash
npx eslint . --max-warnings 0
```

Expected: clean

- [ ] **Step 4: Run formatter**

```bash
npx prettier --check .
```

If any files need formatting: `npx prettier --write .` then re-check.

- [ ] **Step 5: Build**

```bash
npx next build
```

Expected: successful build

- [ ] **Step 6: Push**

```bash
git push
```
