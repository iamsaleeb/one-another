# Home Filter Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace line tabs on the home page with three separate outline Button filters ("Your churches", "All events", "Saved"), add Saved events to the home feed, and remove Saved from the My Events page.

**Architecture:** The `HomeEventTabs` client component swaps Radix Tabs for three shadcn `Button` components with `aria-pressed` and `data-state` active styling. The home page server component adds a parallel `getMySavedEventsPaged` fetch. The My Events page loses its Saved tab and the `MySavedTab` component is deleted.

> **Implementation note:** `ToggleGroup` was evaluated but renders `type="single"` items as `role="radio"`, which conflicts with toolbar-style button semantics. Plain `Button` + `aria-pressed` is the correct accessible pattern here.

**Tech Stack:** Next.js App Router (server components, async searchParams), shadcn `Button`, React `useState`, Jest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `domains/events/components/__tests__/home-event-tabs.test.tsx` | Rewrite for Button filter behaviour |
| `domains/events/components/home-event-tabs.tsx` | Replace Tabs with Button filters, add Saved |
| `app/(app)/(with-nav)/page.tsx` | Add `savedPage` fetch + new props |
| `app/(app)/(with-nav)/my-events/page.tsx` | Remove saved fetch + props |
| `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx` | Remove Saved tab |
| `app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx` | Delete |

---

## Task 1: Rewrite HomeEventTabs tests for ToggleGroup

**Files:**
- Modify: `domains/events/components/__tests__/home-event-tabs.test.tsx`

The current tests query `role="tab"` and `data-state="active"` — those are Radix Tabs-specific. The new component uses `ToggleGroup` where items render as `role="button"` with `data-state="on"` (active) / `data-state="off"` (inactive). Rewrite the whole file to cover the new behaviour including the "Saved" button and the deselection guard.

- [ ] **Step 1: Replace the entire test file**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeEventTabs } from "@/domains/events/components/home-event-tabs";
import type { EventCardItem } from "@/lib/types/pagination";

jest.mock("@/domains/events/components/infinite-event-list", () => ({
  InfiniteEventList: ({
    emptyMessage,
    initialItems,
  }: {
    emptyMessage?: string;
    initialItems: EventCardItem[];
  }) => (
    <div data-testid="infinite-list">
      {initialItems.length === 0 && emptyMessage && (
        <span data-testid="empty-msg">{emptyMessage}</span>
      )}
      {initialItems.map((i) => (
        <div key={i.id} data-testid="event-item">
          {i.title}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("lucide-react", () => ({ CalendarDays: () => null }));

const makeItem = (id: string): EventCardItem => ({
  id,
  title: `Event ${id}`,
  datetime: null,
  tag: "Worship",
  host: null,
  church: { name: "Test Church" },
});

const emptyPage = { items: [], nextCursor: null };
const loadMore = jest.fn();

const guestProps = {
  defaultTab: "other" as const,
  followedPage: emptyPage,
  otherPage: { items: [makeItem("1")], nextCursor: null },
  savedPage: emptyPage,
  isAuthenticated: false,
  loadMoreFollowed: loadMore,
  loadMoreOther: loadMore,
  loadMoreSaved: loadMore,
};

const authProps = {
  defaultTab: "followed" as const,
  followedPage: { items: [makeItem("f1")], nextCursor: null },
  otherPage: { items: [makeItem("o1")], nextCursor: null },
  savedPage: { items: [makeItem("s1")], nextCursor: null },
  isAuthenticated: true,
  loadMoreFollowed: loadMore,
  loadMoreOther: loadMore,
  loadMoreSaved: loadMore,
};

describe("HomeEventTabs", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("unauthenticated", () => {
    it("renders event list with no buttons", () => {
      render(<HomeEventTabs {...guestProps} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event 1");
    });

    it("does not show Saved button", () => {
      render(<HomeEventTabs {...guestProps} />);
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });
  });

  describe("authenticated", () => {
    it("shows three buttons", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(screen.getByRole("button", { name: "Your churches" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All events" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    });

    it("activates defaultTab button on mount", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(screen.getByRole("button", { name: "Your churches" })).toHaveAttribute(
        "data-state",
        "on"
      );
      expect(screen.getByRole("button", { name: "All events" })).toHaveAttribute(
        "data-state",
        "off"
      );
    });

    it("defaults to All events when defaultTab is 'other'", () => {
      render(<HomeEventTabs {...authProps} defaultTab="other" />);
      expect(screen.getByRole("button", { name: "All events" })).toHaveAttribute(
        "data-state",
        "on"
      );
    });

    it("shows followed events when Your churches is active", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event f1");
    });

    it("switches to All events list on click", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      await user.click(screen.getByRole("button", { name: "All events" }));
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event o1");
    });

    it("switches to Saved list on click", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      await user.click(screen.getByRole("button", { name: "Saved" }));
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event s1");
    });

    it("deselection guard: clicking active button keeps same list visible", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      // Your churches is active, click it again
      await user.click(screen.getByRole("button", { name: "Your churches" }));
      // Should still show followed events, not empty
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event f1");
    });

    it("shows empty state message when followed page has no events", async () => {
      const user = userEvent.setup();
      render(
        <HomeEventTabs
          {...authProps}
          followedPage={emptyPage}
          defaultTab="other"
        />
      );
      await user.click(screen.getByRole("button", { name: "Your churches" }));
      expect(
        screen.getByText(/no upcoming events from churches you follow/i)
      ).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the tests — expect them to FAIL**

```bash
npx jest domains/events/components/__tests__/home-event-tabs.test.tsx --no-coverage
```

Expected: multiple failures — tests look for `role="button"` but find `role="tab"`, and `savedPage` / `loadMoreSaved` props don't exist yet.

---

## Task 2: Rewrite HomeEventTabs component

**Files:**
- Modify: `domains/events/components/home-event-tabs.tsx`

Replace the Radix Tabs with a controlled `ToggleGroup`. Add `savedPage` and `loadMoreSaved` props. Guard `onValueChange` against empty string (Radix fires `""` when the active item is clicked again).

- [ ] **Step 1: Replace the component**

```tsx
"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InfiniteEventList } from "./infinite-event-list";
import type { EventCardItem, LoadMoreFn } from "@/lib/types/pagination";

type ActiveTab = "followed" | "other" | "saved";

interface HomeEventTabsProps {
  defaultTab: "followed" | "other";
  followedPage: { items: EventCardItem[]; nextCursor: string | null };
  otherPage: { items: EventCardItem[]; nextCursor: string | null };
  savedPage: { items: EventCardItem[]; nextCursor: string | null };
  isAuthenticated: boolean;
  loadMoreFollowed: LoadMoreFn;
  loadMoreOther: LoadMoreFn;
  loadMoreSaved: LoadMoreFn;
}

export function HomeEventTabs({
  defaultTab,
  followedPage,
  otherPage,
  savedPage,
  isAuthenticated,
  loadMoreFollowed,
  loadMoreOther,
  loadMoreSaved,
}: HomeEventTabsProps) {
  const [active, setActive] = useState<ActiveTab>(defaultTab);

  if (!isAuthenticated) {
    return (
      <InfiniteEventList
        initialItems={otherPage.items}
        initialCursor={otherPage.nextCursor}
        loadMore={loadMoreOther}
        emptyMessage="No upcoming events"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted/20 sticky top-0 z-10 pt-2 backdrop-blur-sm">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={active}
          onValueChange={(val) => {
            if (val) setActive(val as ActiveTab);
          }}
        >
          <ToggleGroupItem value="followed">Your churches</ToggleGroupItem>
          <ToggleGroupItem value="other">All events</ToggleGroupItem>
          <ToggleGroupItem value="saved">Saved</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {active === "followed" && (
        <InfiniteEventList
          initialItems={followedPage.items}
          initialCursor={followedPage.nextCursor}
          loadMore={loadMoreFollowed}
          emptyMessage="No upcoming events from churches you follow"
        />
      )}
      {active === "other" && (
        <InfiniteEventList
          initialItems={otherPage.items}
          initialCursor={otherPage.nextCursor}
          loadMore={loadMoreOther}
          emptyMessage="No upcoming events"
        />
      )}
      {active === "saved" && (
        <InfiniteEventList
          initialItems={savedPage.items}
          initialCursor={savedPage.nextCursor}
          loadMore={loadMoreSaved}
          emptyMessage="No saved events"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the tests — expect them to PASS**

```bash
npx jest domains/events/components/__tests__/home-event-tabs.test.tsx --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add domains/events/components/home-event-tabs.tsx domains/events/components/__tests__/home-event-tabs.test.tsx
git commit -m "feat: replace home tabs with ToggleGroup buttons, add Saved filter"
```

---

## Task 3: Update home page server component

**Files:**
- Modify: `app/(app)/(with-nav)/page.tsx`

Add `getMySavedEventsPaged` to the parallel `Promise.all` fetch (guarded by `!hasFilters && userId`, consistent with the existing `followedPage` guard). Import `loadMoreMySavedEventsAction`. Pass both as props to `HomeEventTabs`.

- [ ] **Step 1: Update imports at the top of the file**

Add to the existing `getFollowedChurchEventsPaged` / `getOtherChurchEventsPaged` import block:

```ts
import {
  getFollowedChurchEventsPaged,
  getOtherChurchEventsPaged,
  getMySavedEventsPaged,
} from "@/domains/events/actions/data";
```

Add to the existing `loadMoreFollowedEventsAction` / `loadMoreOtherEventsAction` import block:

```ts
import {
  loadMoreFollowedEventsAction,
  loadMoreOtherEventsAction,
  loadMoreMySavedEventsAction,
} from "@/domains/events/actions/pagination";
```

- [ ] **Step 2: Add saved fetch to Promise.all**

Replace the existing `Promise.all` block (lines 38–53 in the current file):

```ts
const [searchResults, followedPage, otherPage, savedPage] = await Promise.all([
  hasFilters
    ? searchEventsAndChurches({
        query,
        type,
        when: when as WhenFilter | undefined,
        category: category ?? "",
      })
    : Promise.resolve(null),
  !hasFilters && userId
    ? getFollowedChurchEventsPaged(userId, null)
    : Promise.resolve({ items: [], nextCursor: null }),
  !hasFilters
    ? getOtherChurchEventsPaged(userId, null)
    : Promise.resolve({ items: [], nextCursor: null }),
  !hasFilters && userId
    ? getMySavedEventsPaged(userId, null)
    : Promise.resolve({ items: [], nextCursor: null }),
]);
```

- [ ] **Step 3: Pass new props to HomeEventTabs**

Replace the `<HomeEventTabs ... />` JSX (currently lines 141–148):

```tsx
<HomeEventTabs
  defaultTab={defaultTab}
  followedPage={followedPage}
  otherPage={otherPage}
  savedPage={savedPage}
  isAuthenticated={!!userId}
  loadMoreFollowed={loadMoreFollowedEventsAction}
  loadMoreOther={loadMoreOtherEventsAction}
  loadMoreSaved={loadMoreMySavedEventsAction}
/>
```

- [ ] **Step 4: Run the full test suite to check nothing broke**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(with-nav)/page.tsx"
git commit -m "feat: fetch saved events on home page and pass to HomeEventTabs"
```

---

## Task 4: Remove Saved from My Events page

**Files:**
- Modify: `app/(app)/(with-nav)/my-events/page.tsx`
- Modify: `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx`
- Delete: `app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx`

Saved events now live on the home page only. Strip them from `my-events`.

- [ ] **Step 1: Update my-events/page.tsx**

Replace the entire file with:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
} from "@/domains/events/actions/data";
import { getUserFollowedSeries } from "@/domains/series/actions/data";
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

- [ ] **Step 2: Update my-events-tabs.tsx**

Replace the entire file with:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getUserFollowedSeries } from "@/domains/series/actions/data";
import type { EventCardItem } from "@/lib/types/pagination";
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

- [ ] **Step 3: Delete my-saved-tab.tsx**

```bash
rm "app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx"
```

- [ ] **Step 4: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(with-nav)/my-events/page.tsx" "app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx"
git rm "app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx"
git commit -m "chore: remove Saved tab from My Events (moved to home page)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Replace tabs with ToggleGroup outline buttons — Task 2
- ✅ Three separate (not joined) buttons — `spacing={2}` in Task 2
- ✅ Unauthenticated: no buttons, show all events directly — Task 2
- ✅ Authenticated: all 3 buttons — Task 2
- ✅ Default tab logic preserved — `defaultTab` prop unchanged, Task 3
- ✅ Saved fetch added to home page Promise.all — Task 3
- ✅ Deselection guard on onValueChange — Task 2, tested in Task 1
- ✅ Remove Saved from My Events — Task 4
- ✅ Delete MySavedTab — Task 4

**Placeholder scan:** None found.

**Type consistency:**
- `ActiveTab = "followed" | "other" | "saved"` defined in Task 2, used in Task 2 only
- `savedPage` / `loadMoreSaved` props defined in Task 2 interface, passed in Task 3
- `HomeEventTabsProps` in Task 2 matches call site in Task 3
- `MyEventsTabsProps` in Task 4 has `savedItems`/`savedCursor` removed, matches Task 4 page.tsx
