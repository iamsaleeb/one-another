# Infinite Scroll for Event Lists — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace full-list event fetching with cursor-based infinite scroll (10 items/page) on the Home, My Events, and Organiser pages.

**Architecture:** Server Components fetch page 1 via new `*Paged` functions in `data-events.ts` (`"use cache: remote"`). A `"use server"` actions file wraps each list with auth. A single `InfiniteEventList` client component uses `IntersectionObserver` + `useTransition` + Server Action to load subsequent pages. Server Actions are imported directly by the tab components that need them.

**Tech Stack:** Next.js 16 App Router, Prisma cursor pagination, React `useTransition`, `IntersectionObserver`, Jest + Testing Library.

---

## File Map

| Action | File                                                            |
| ------ | --------------------------------------------------------------- |
| Create | `types/pagination.ts`                                           |
| Modify | `lib/actions/data-events.ts`                                    |
| Modify | `lib/actions/__tests__/data.test.ts`                            |
| Create | `lib/actions/events-pagination.ts`                              |
| Create | `lib/actions/__tests__/events-pagination.test.ts`               |
| Create | `components/infinite-event-list.tsx`                            |
| Create | `components/__tests__/infinite-event-list.test.tsx`             |
| Modify | `app/(app)/(with-nav)/page.tsx`                                 |
| Modify | `app/(app)/(with-nav)/my-events/page.tsx`                       |
| Modify | `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx` |
| Modify | `app/(app)/(with-nav)/my-events/_components/my-events-tab.tsx`  |
| Modify | `app/(app)/(with-nav)/organiser/page.tsx`                       |
| Modify | `app/(app)/(with-nav)/organiser/_components/organiser-tabs.tsx` |
| Modify | `app/(app)/(with-nav)/organiser/_components/my-content-tab.tsx` |
| Modify | `app/(app)/(with-nav)/organiser/_components/community-tab.tsx`  |
| Delete | `components/event-list.tsx`                                     |

---

## Task 1: Shared types

**Files:**

- Create: `types/pagination.ts`

- [ ] **Step 1: Create the types file**

```ts
// types/pagination.ts
export type EventCardItem = {
  id: string;
  datetime: Date | null;
  title: string;
  tag: string;
  host: string | null;
  cancelledAt?: Date | null;
  isDraft?: boolean;
  photoUrl?: string | null;
  church: { name: string } | null;
};

export type LoadMoreFn = (
  cursor: string | null
) => Promise<{ items: EventCardItem[]; nextCursor: string | null }>;
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/pagination.ts
git commit -m "feat: add shared pagination types"
```

---

## Task 2: Paginated data functions

**Files:**

- Modify: `lib/actions/data-events.ts`
- Modify: `lib/actions/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `lib/actions/__tests__/data.test.ts`, after the existing imports and before or after existing describes. The file already mocks `next/cache` and `@/lib/db` with `prisma.event.findMany`.

```ts
import {
  getEvents,
  getEventById,
  getEventMeta,
  getMyEventAttendance,
  getEventsByCreator,
  getEventsNotByCreator,
  getEventAttendees,
  getUserAttendedEvents,
  getUserAttendedPastEvents,
  // ADD these new imports:
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
} from "@/lib/actions/data-events";
```

Add these describe blocks at the end of the file:

```ts
const pagedEvent = {
  id: "evt-1",
  title: "Sunday Service",
  datetime: new Date("2026-06-01T09:00:00Z"),
  location: "Main Hall",
  host: "Pastor John",
  tag: "Youth Meeting",
  cancelledAt: null,
  isDraft: false,
  photoUrl: null,
  church: { name: "Grace Church" },
};

describe("getEventsPaged", () => {
  it("returns items and null nextCursor when fewer than PAGE_SIZE+1 results", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getEventsPaged(null);
    expect(result.items).toEqual([pagedEvent]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns PAGE_SIZE items and nextCursor when more than PAGE_SIZE results exist", async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => ({
      ...pagedEvent,
      id: `evt-${i}`,
    }));
    mockEventFindMany.mockResolvedValue(eleven);
    const result = await getEventsPaged(null);
    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe("evt-9");
  });

  it("passes cursor and skip to prisma when cursor is provided", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsPaged("evt-5");
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "evt-5" }, skip: 1 })
    );
  });

  it("does not pass cursor when cursor is null", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsPaged(null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ cursor: expect.anything() })
    );
  });
});

describe("getUserAttendedEventsPaged", () => {
  it("returns items filtered by userId", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getUserAttendedEventsPaged("user-1", null);
    expect(result.items).toEqual([pagedEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          attendees: { some: { userId: "user-1" } },
        }),
      })
    );
  });

  it("returns null nextCursor when at last page", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getUserAttendedEventsPaged("user-1", null);
    expect(result.nextCursor).toBeNull();
  });
});

describe("getUserAttendedPastEventsPaged", () => {
  it("filters by datetime lt and orders desc", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getUserAttendedPastEventsPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ datetime: { lt: expect.any(Date) } }),
        orderBy: { datetime: "desc" },
      })
    );
  });
});

describe("getEventsByCreatorPaged", () => {
  it("filters by createdById", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsByCreatorPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: "user-1" },
      })
    );
  });
});

describe("getEventsNotByCreatorPaged", () => {
  it("excludes events by the given userId", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsNotByCreatorPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ createdById: { not: "user-1" } }, { createdById: null }],
        }),
      })
    );
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest lib/actions/__tests__/data.test.ts --testNamePattern="Paged" --no-coverage
```

Expected: FAIL — `getEventsPaged is not a function`.

- [ ] **Step 3: Add PAGE_SIZE constant and five paginated functions to `data-events.ts`**

Add after the existing imports at the top of `lib/actions/data-events.ts`:

```ts
import type { EventCardItem } from "@/types/pagination";
```

Add `PAGE_SIZE` constant after the existing TTL comment, and the five new functions at the end of the file:

```ts
const PAGE_SIZE = 10;

export async function getEventsPaged(
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag("events-list");
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: { datetime: { gte: new Date() }, isDraft: false },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { church: { select: { name: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getUserAttendedEventsPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag(`user-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      datetime: { gte: new Date() },
      isDraft: false,
      attendees: { some: { userId } },
    },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { church: { select: { name: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getUserAttendedPastEventsPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag(`user-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      datetime: { lt: new Date() },
      isDraft: false,
      attendees: { some: { userId } },
    },
    orderBy: { datetime: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { church: { select: { name: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getEventsByCreatorPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag(`user-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: { createdById: userId },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getEventsNotByCreatorPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag("events-list");
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      datetime: { gte: new Date() },
      isDraft: false,
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/actions/__tests__/data.test.ts --no-coverage
```

Expected: all tests pass including new Paged suites.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/data-events.ts lib/actions/__tests__/data.test.ts
git commit -m "feat: add cursor-based paginated data functions (PAGE_SIZE=10)"
```

---

## Task 3: Server Action wrappers

**Files:**

- Create: `lib/actions/events-pagination.ts`
- Create: `lib/actions/__tests__/events-pagination.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/actions/__tests__/events-pagination.test.ts`:

```ts
jest.mock("@/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/actions/data-events", () => ({
  getEventsPaged: jest.fn(),
  getUserAttendedEventsPaged: jest.fn(),
  getUserAttendedPastEventsPaged: jest.fn(),
  getEventsByCreatorPaged: jest.fn(),
  getEventsNotByCreatorPaged: jest.fn(),
}));

import { auth } from "@/auth";
import {
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
} from "@/lib/actions/data-events";
import {
  loadMoreEventsAction,
  loadMoreMyUpcomingEventsAction,
  loadMoreMyPastEventsAction,
  loadMoreMyCreatedEventsAction,
  loadMoreCommunityEventsAction,
} from "@/lib/actions/events-pagination";

const mockAuth = auth as jest.Mock;
const mockGetEventsPaged = getEventsPaged as jest.Mock;
const mockGetUserAttendedEventsPaged = getUserAttendedEventsPaged as jest.Mock;
const mockGetUserAttendedPastEventsPaged =
  getUserAttendedPastEventsPaged as jest.Mock;
const mockGetEventsByCreatorPaged = getEventsByCreatorPaged as jest.Mock;
const mockGetEventsNotByCreatorPaged = getEventsNotByCreatorPaged as jest.Mock;

const fakePage = { items: [], nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEventsPaged.mockResolvedValue(fakePage);
  mockGetUserAttendedEventsPaged.mockResolvedValue(fakePage);
  mockGetUserAttendedPastEventsPaged.mockResolvedValue(fakePage);
  mockGetEventsByCreatorPaged.mockResolvedValue(fakePage);
  mockGetEventsNotByCreatorPaged.mockResolvedValue(fakePage);
});

describe("loadMoreEventsAction", () => {
  it("calls getEventsPaged with the provided cursor", async () => {
    await loadMoreEventsAction("cursor-abc");
    expect(mockGetEventsPaged).toHaveBeenCalledWith("cursor-abc");
  });

  it("works without auth", async () => {
    const result = await loadMoreEventsAction(null);
    expect(result).toEqual(fakePage);
  });
});

describe("loadMoreMyUpcomingEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyUpcomingEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
    expect(mockGetUserAttendedEventsPaged).not.toHaveBeenCalled();
  });

  it("calls getUserAttendedEventsPaged with userId and cursor when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyUpcomingEventsAction("cursor-x");
    expect(mockGetUserAttendedEventsPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-x"
    );
  });
});

describe("loadMoreMyPastEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyPastEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getUserAttendedPastEventsPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyPastEventsAction("cursor-y");
    expect(mockGetUserAttendedPastEventsPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-y"
    );
  });
});

describe("loadMoreMyCreatedEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyCreatedEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getEventsByCreatorPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyCreatedEventsAction(null);
    expect(mockGetEventsByCreatorPaged).toHaveBeenCalledWith("user-1", null);
  });
});

describe("loadMoreCommunityEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreCommunityEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getEventsNotByCreatorPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreCommunityEventsAction("cursor-z");
    expect(mockGetEventsNotByCreatorPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-z"
    );
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest lib/actions/__tests__/events-pagination.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/actions/events-pagination.ts`**

```ts
"use server";

import { auth } from "@/auth";
import type { EventCardItem } from "@/types/pagination";
import {
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
} from "@/lib/actions/data-events";

type Page = { items: EventCardItem[]; nextCursor: string | null };

const empty: Page = { items: [], nextCursor: null };

export async function loadMoreEventsAction(
  cursor: string | null
): Promise<Page> {
  return getEventsPaged(cursor);
}

export async function loadMoreMyUpcomingEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getUserAttendedEventsPaged(session.user.id, cursor);
}

export async function loadMoreMyPastEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getUserAttendedPastEventsPaged(session.user.id, cursor);
}

export async function loadMoreMyCreatedEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getEventsByCreatorPaged(session.user.id, cursor);
}

export async function loadMoreCommunityEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getEventsNotByCreatorPaged(session.user.id, cursor);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/actions/__tests__/events-pagination.test.ts --no-coverage
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/events-pagination.ts lib/actions/__tests__/events-pagination.test.ts
git commit -m "feat: add server action wrappers for paginated event loading"
```

---

## Task 4: InfiniteEventList client component

**Files:**

- Create: `components/infinite-event-list.tsx`
- Create: `components/__tests__/infinite-event-list.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `components/__tests__/infinite-event-list.test.tsx`:

```tsx
import { render, screen, act, waitFor } from "@testing-library/react";
import { InfiniteEventList } from "@/components/infinite-event-list";
import type { EventCardItem } from "@/types/pagination";

// Mock EventCard to keep tests simple
jest.mock("@/components/event-card", () => ({
  EventCard: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

// Mock EmptyState
jest.mock("@/components/empty-state", () => ({
  EmptyState: ({ label }: { label: string }) => (
    <div data-testid="empty-state">{label}</div>
  ),
}));

// Mock Skeleton
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock lucide icon used by EmptyState
jest.mock("lucide-react", () => ({ CalendarDays: () => null }));

const makeItem = (id: string): EventCardItem => ({
  id,
  title: `Event ${id}`,
  datetime: null,
  tag: "Worship",
  host: null,
  church: { name: "Test Church" },
});

let intersectionCallback: (
  entries: IntersectionObserverEntry[]
) => void = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  global.IntersectionObserver = jest.fn((cb) => {
    intersectionCallback = cb;
    return {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
  }) as unknown as typeof IntersectionObserver;
});

describe("InfiniteEventList", () => {
  it("renders all initial items", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1"), makeItem("2")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    expect(screen.getAllByTestId("event-card")).toHaveLength(2);
  });

  it("renders the title when provided", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
        title="Upcoming Events"
      />
    );
    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
  });

  it("shows empty state when no items and no cursor", () => {
    render(
      <InfiniteEventList
        initialItems={[]}
        initialCursor={null}
        loadMore={jest.fn()}
        emptyMessage="Nothing here"
      />
    );
    expect(screen.getByTestId("empty-state")).toHaveTextContent("Nothing here");
  });

  it("does not show empty state when items exist", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not render sentinel when cursor is null", () => {
    const { container } = render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    // No IntersectionObserver should be created
    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });

  it("sets up IntersectionObserver when cursor is not null", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={jest.fn()}
      />
    );
    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  it("calls loadMore with current cursor when sentinel intersects", async () => {
    const loadMore = jest
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => {
      expect(loadMore).toHaveBeenCalledWith("cursor-1");
    });
  });

  it("appends new items after loadMore resolves", async () => {
    const loadMore = jest.fn().mockResolvedValue({
      items: [makeItem("2"), makeItem("3")],
      nextCursor: null,
    });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("event-card")).toHaveLength(3);
    });
  });

  it("does not call loadMore when isIntersecting is false", async () => {
    const loadMore = jest.fn();
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });
    expect(loadMore).not.toHaveBeenCalled();
  });

  it("stops setting up observer after nextCursor becomes null", async () => {
    const loadMore = jest
      .fn()
      .mockResolvedValue({ items: [makeItem("2")], nextCursor: null });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => expect(loadMore).toHaveBeenCalledTimes(1));
    // After cursor becomes null the observer should not be re-registered
    // Call count stays at 1 even if intersection fires again
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npx jest components/__tests__/infinite-event-list.test.tsx --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/infinite-event-list.tsx`**

```tsx
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventCardItem, LoadMoreFn } from "@/types/pagination";

interface InfiniteEventListProps {
  initialItems: EventCardItem[];
  initialCursor: string | null;
  loadMore: LoadMoreFn;
  title?: string;
  emptyMessage?: string;
}

export function InfiniteEventList({
  initialItems,
  initialCursor,
  loadMore,
  title,
  emptyMessage = "No events",
}: InfiniteEventListProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!cursor) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current) return;
        loadingRef.current = true;
        startTransition(async () => {
          const result = await loadMore(cursor);
          setItems((prev) => [...prev, ...result.items]);
          setCursor(result.nextCursor);
          loadingRef.current = false;
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [cursor, loadMore]);

  if (items.length === 0 && !cursor) {
    return <EmptyState icon={CalendarDays} label={emptyMessage} />;
  }

  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      {items.map((item) => (
        <EventCard
          key={item.id}
          event={{
            ...item,
            badge: item.tag,
            churchName: item.church?.name ?? "",
          }}
        />
      ))}
      {cursor && (
        <div ref={sentinelRef}>
          {isPending && <Skeleton className="h-24 w-full rounded-2xl" />}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest components/__tests__/infinite-event-list.test.tsx --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/infinite-event-list.tsx components/__tests__/infinite-event-list.test.tsx
git commit -m "feat: add InfiniteEventList client component with IntersectionObserver"
```

---

## Task 5: Update home page

**Files:**

- Modify: `app/(app)/(with-nav)/page.tsx`

The home page renders search results (unchanged) or the default event list (replaced with `InfiniteEventList`). App pages are excluded from Jest coverage so no new test needed.

- [ ] **Step 1: Update `app/(app)/(with-nav)/page.tsx`**

Replace the file contents with:

```tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { searchEventsAndChurches } from "@/lib/actions/data-user";
import { getEventsPaged } from "@/lib/actions/data-events";
import { loadMoreEventsAction } from "@/lib/actions/events-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { WHEN_LABELS, TYPE_LABELS, type WhenFilter } from "@/types/search";
import { searchParamsSchema } from "@/lib/validations/search";
import { InfiniteEventList } from "@/components/infinite-event-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    when?: string;
    category?: string;
  }>;
}) {
  const { q, type, when, category } = searchParamsSchema
    .catch({ q: undefined, type: "all", when: undefined, category: undefined })
    .parse(await searchParams);
  const query = q?.trim() ?? "";
  const hasFilters = !!(query || type !== "all" || when || category);

  const [searchResults, eventPage] = await Promise.all([
    hasFilters
      ? searchEventsAndChurches({
          query,
          type,
          when: when as WhenFilter | undefined,
          category: category ?? "",
        })
      : Promise.resolve(null),
    hasFilters ? Promise.resolve(null) : getEventsPaged(null),
  ]);

  const filteredEvents = searchResults?.events ?? null;
  const filteredChurches = searchResults?.churches ?? null;

  const hasResults =
    (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

  const filterParts = [
    query ? `"${query}"` : null,
    category || null,
    when ? WHEN_LABELS[when as WhenFilter] : null,
    type && type !== "all" ? TYPE_LABELS[type] : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={hasFilters ? "Results" : "Home"}
        description={
          filterParts.length ? `Showing: ${filterParts.join(" · ")}` : undefined
        }
      />

      <div className="flex flex-col gap-6 px-4 py-2">
        {hasFilters ? (
          !hasResults ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <SearchX className="text-muted-foreground/40 size-10" />
              <p className="text-base font-semibold">No results found</p>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {filteredEvents && filteredEvents.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Events{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      ({filteredEvents.length})
                    </span>
                  </h2>
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={{
                        ...event,
                        badge: event.tag,
                        churchName: event.church?.name ?? "",
                      }}
                    />
                  ))}
                </section>
              )}

              {filteredChurches && filteredChurches.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Churches{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      ({filteredChurches.length})
                    </span>
                  </h2>
                  {filteredChurches.map((church) => (
                    <Link key={church.id} href={`/churches/${church.id}`}>
                      <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold">{church.name}</p>
                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
                              <MapPin className="size-3" />
                              {church.address}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </section>
              )}
            </>
          )
        ) : (
          eventPage && (
            <InfiniteEventList
              initialItems={eventPage.items}
              initialCursor={eventPage.nextCursor}
              loadMore={loadMoreEventsAction}
              title="Upcoming Events"
              emptyMessage="No upcoming events"
            />
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(with-nav)/page.tsx"
git commit -m "feat: use InfiniteEventList on home page"
```

---

## Task 6: Update My Events

**Files:**

- Modify: `app/(app)/(with-nav)/my-events/page.tsx`
- Modify: `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx`
- Modify: `app/(app)/(with-nav)/my-events/_components/my-events-tab.tsx`

- [ ] **Step 1: Update `my-events/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
} from "@/lib/actions/data-events";
import { getUserFollowedSeries } from "@/lib/actions/data-series";
import { MyEventsTabs } from "./_components/my-events-tabs";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [upcomingPage, pastPage, followedSeries] = await Promise.all([
    getUserAttendedEventsPaged(userId, null),
    getUserAttendedPastEventsPaged(userId, null),
    getUserFollowedSeries(userId),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="My Events"
        description={`${upcomingPage.items.length}${upcomingPage.nextCursor ? "+" : ""} upcoming`}
      />
      <MyEventsTabs
        upcomingItems={upcomingPage.items}
        upcomingCursor={upcomingPage.nextCursor}
        pastItems={pastPage.items}
        pastCursor={pastPage.nextCursor}
        followedSeries={followedSeries}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `my-events-tabs.tsx`**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getUserFollowedSeries } from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";
import { MyEventsTab } from "./my-events-tab";
import { MySeriesTab } from "./my-series-tab";

interface MyEventsTabsProps {
  upcomingItems: EventCardItem[];
  upcomingCursor: string | null;
  pastItems: EventCardItem[];
  pastCursor: string | null;
  followedSeries: Awaited<ReturnType<typeof getUserFollowedSeries>>;
}

export function MyEventsTabs({
  upcomingItems,
  upcomingCursor,
  pastItems,
  pastCursor,
  followedSeries,
}: MyEventsTabsProps) {
  return (
    <Tabs defaultValue="events">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
      </div>
      <div className="px-4 pt-5">
        <TabsContent value="events">
          <MyEventsTab
            upcomingItems={upcomingItems}
            upcomingCursor={upcomingCursor}
            pastItems={pastItems}
            pastCursor={pastCursor}
          />
        </TabsContent>
        <TabsContent value="series">
          <MySeriesTab series={followedSeries} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
```

- [ ] **Step 3: Update `my-events-tab.tsx`**

```tsx
import { InfiniteEventList } from "@/components/infinite-event-list";
import {
  loadMoreMyUpcomingEventsAction,
  loadMoreMyPastEventsAction,
} from "@/lib/actions/events-pagination";
import type { EventCardItem } from "@/types/pagination";

interface MyEventsTabProps {
  upcomingItems: EventCardItem[];
  upcomingCursor: string | null;
  pastItems: EventCardItem[];
  pastCursor: string | null;
}

export function MyEventsTab({
  upcomingItems,
  upcomingCursor,
  pastItems,
  pastCursor,
}: MyEventsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <InfiniteEventList
        initialItems={upcomingItems}
        initialCursor={upcomingCursor}
        loadMore={loadMoreMyUpcomingEventsAction}
        title="Upcoming"
        emptyMessage="No upcoming events"
      />
      <InfiniteEventList
        initialItems={pastItems}
        initialCursor={pastCursor}
        loadMore={loadMoreMyPastEventsAction}
        title="Past"
        emptyMessage="No past events"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(with-nav)/my-events/page.tsx" "app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx" "app/(app)/(with-nav)/my-events/_components/my-events-tab.tsx"
git commit -m "feat: infinite scroll on My Events page"
```

---

## Task 7: Update Organiser

**Files:**

- Modify: `app/(app)/(with-nav)/organiser/page.tsx`
- Modify: `app/(app)/(with-nav)/organiser/_components/organiser-tabs.tsx`
- Modify: `app/(app)/(with-nav)/organiser/_components/my-content-tab.tsx`
- Modify: `app/(app)/(with-nav)/organiser/_components/community-tab.tsx`

- [ ] **Step 1: Update `organiser/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import {
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
} from "@/lib/actions/data-events";
import {
  getSeriesByCreator,
  getSeriesNotByCreator,
} from "@/lib/actions/data-series";
import { OrganiserTabs } from "./_components/organiser-tabs";

export default async function OrganiserPage() {
  const session = await auth();

  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    redirect("/");
  }

  const userId = session.user.id;

  const [myEventsPage, mySeries, communityEventsPage, communitySeries] =
    await Promise.all([
      getEventsByCreatorPaged(userId, null),
      getSeriesByCreator(userId),
      getEventsNotByCreatorPaged(userId, null),
      getSeriesNotByCreator(userId),
    ]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Organiser Tools" />
      <OrganiserTabs
        myItems={myEventsPage.items}
        myCursor={myEventsPage.nextCursor}
        mySeries={mySeries}
        communityItems={communityEventsPage.items}
        communityCursor={communityEventsPage.nextCursor}
        communitySeries={communitySeries}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `organiser-tabs.tsx`**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  getSeriesByCreator,
  getSeriesNotByCreator,
} from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";
import { MyContentTab } from "./my-content-tab";
import { CommunityTab } from "./community-tab";

interface OrganiserTabsProps {
  myItems: EventCardItem[];
  myCursor: string | null;
  mySeries: Awaited<ReturnType<typeof getSeriesByCreator>>;
  communityItems: EventCardItem[];
  communityCursor: string | null;
  communitySeries: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function OrganiserTabs({
  myItems,
  myCursor,
  mySeries,
  communityItems,
  communityCursor,
  communitySeries,
}: OrganiserTabsProps) {
  return (
    <Tabs defaultValue="my-content">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="my-content">My Content</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
      </div>

      <div className="px-4 pt-5">
        <TabsContent value="my-content">
          <MyContentTab items={myItems} cursor={myCursor} series={mySeries} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityTab
            items={communityItems}
            cursor={communityCursor}
            series={communitySeries}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
```

- [ ] **Step 3: Update `my-content-tab.tsx`**

```tsx
import Link from "next/link";
import { Repeat } from "lucide-react";
import { InfiniteEventList } from "@/components/infinite-event-list";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { loadMoreMyCreatedEventsAction } from "@/lib/actions/events-pagination";
import type { getSeriesByCreator } from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

interface MyContentTabProps {
  items: EventCardItem[];
  cursor: string | null;
  series: Awaited<ReturnType<typeof getSeriesByCreator>>;
}

export function MyContentTab({ items, cursor, series }: MyContentTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <InfiniteEventList
        initialItems={items}
        initialCursor={cursor}
        loadMore={loadMoreMyCreatedEventsAction}
        title="My Events"
        emptyMessage="No upcoming events"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">My Series</h2>
        {series.length === 0 ? (
          <EmptyState icon={Repeat} label="No series yet" />
        ) : (
          series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {CADENCE_LABELS[s.cadence] ?? s.cadence}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base leading-snug font-bold">{s.name}</p>
                  <p className="text-muted-foreground text-sm">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Update `community-tab.tsx`**

```tsx
import Link from "next/link";
import { Repeat } from "lucide-react";
import { InfiniteEventList } from "@/components/infinite-event-list";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { loadMoreCommunityEventsAction } from "@/lib/actions/events-pagination";
import type { getSeriesNotByCreator } from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

interface CommunityTabProps {
  items: EventCardItem[];
  cursor: string | null;
  series: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function CommunityTab({ items, cursor, series }: CommunityTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <InfiniteEventList
        initialItems={items}
        initialCursor={cursor}
        loadMore={loadMoreCommunityEventsAction}
        title="Events"
        emptyMessage="No events from others"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Series</h2>
        {series.length === 0 ? (
          <EmptyState icon={Repeat} label="No series from others" />
        ) : (
          series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {s.createdBy?.name ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base leading-snug font-bold">{s.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {CADENCE_LABELS[s.cadence] ?? s.cadence}
                  </p>
                  <p className="text-muted-foreground text-sm">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/(with-nav)/organiser/page.tsx" "app/(app)/(with-nav)/organiser/_components/organiser-tabs.tsx" "app/(app)/(with-nav)/organiser/_components/my-content-tab.tsx" "app/(app)/(with-nav)/organiser/_components/community-tab.tsx"
git commit -m "feat: infinite scroll on Organiser page"
```

---

## Task 8: Clean up and full verification

**Files:**

- Delete: `components/event-list.tsx`

- [ ] **Step 1: Delete the now-unused EventList component**

```bash
rm components/event-list.tsx
```

- [ ] **Step 2: Confirm no remaining references**

```bash
grep -r "event-list" --include="*.ts" --include="*.tsx" .
```

Expected: only the deleted file path appears in git status, no imports.

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:coverage
```

Expected: all suites pass, coverage stays above 80% thresholds.

- [ ] **Step 4: Run lint and type check**

```bash
npm run lint && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run production build**

```bash
npm run build
```

Expected: all 30 routes compile successfully.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: remove unused EventList component"
```
