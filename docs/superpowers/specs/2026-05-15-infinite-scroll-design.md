# Infinite Scroll for Event Lists

**Date:** 2026-05-15
**Status:** Approved
**Scope:** Home, My Events, Organiser pages (church detail deferred)

---

## Summary

Replace full-list event fetching with cursor-based infinite scroll across all main nav pages. First page is server-rendered; subsequent pages load via Server Action as the user scrolls. Validated against Next.js 16.2.2 documentation via Context7.

---

## Pages in Scope

| Page                     | Lists affected                                            |
| ------------------------ | --------------------------------------------------------- |
| Home (`/`)               | Upcoming events (default view)                            |
| My Events (`/my-events`) | Upcoming tab, Past tab                                    |
| Organiser (`/organiser`) | My Content tab (events only), Community tab (events only) |

Search results on the home page are **not** paginated — all results render inline as before. Series sections in Organiser are **not** paginated — small lists, no need.

---

## Page Size

**10 items per page.** Fills ~3 mobile screens, loads fast, natural scroll feel.

---

## Architecture

### Layer 1 — Paginated data functions (`lib/actions/data-events.ts`)

File already has `"use cache: remote"` at file level. Five new `*Paged` functions added alongside existing flat functions (existing functions kept — tests reference them).

Each function:

- Takes `cursor: string | null` — the `id` of the last seen event
- Fetches `PAGE_SIZE + 1` rows; if 11 come back, slice to 10 and return the 10th's `id` as `nextCursor`; if ≤ 10 come back, return `nextCursor: null`
- Uses Prisma cursor pagination: `cursor: { id: cursor }, skip: 1`
- Applies the same `where` filters as the existing flat counterpart
- Calls `cacheTag` + `cacheLife("minutes")` — Next.js 16 cache key includes function ID + serialised arguments, so each `(cursor, userId)` pair gets its own cache entry

```
getEventsPaged(cursor)
getUserAttendedEventsPaged(userId, cursor)
getUserAttendedPastEventsPaged(userId, cursor)
getEventsByCreatorPaged(userId, cursor)
getEventsNotByCreatorPaged(userId, cursor)
```

`userId` is passed as an argument (not read inside the cached function via `auth()`) — required by the `use cache` constraint that runtime APIs cannot be accessed inside a cached scope.

### Layer 2 — Server Action wrappers (`lib/actions/events-pagination.ts`)

New `"use server"` file. One thin action per list. Each:

- Calls `auth()` where the list is user-scoped
- Returns `{ items: [], nextCursor: null }` on auth failure (no throw — client component handles gracefully)
- Delegates to the Layer 1 cached function

```
loadMoreEventsAction(cursor)                 — public, no auth
loadMoreMyUpcomingEventsAction(cursor)       — auth required
loadMoreMyPastEventsAction(cursor)           — auth required
loadMoreMyCreatedEventsAction(cursor)        — auth required
loadMoreCommunityEventsAction(cursor)        — auth required
```

All five actions share the same return shape: `Promise<{ items: EventCardItem[], nextCursor: string | null }>`.

### Layer 3 — Shared client component (`components/infinite-event-list.tsx`)

Single `"use client"` component used by all pages.

**Props:**

```ts
{
  initialItems: EventCardItem[]
  initialCursor: string | null
  loadMore: (cursor: string | null) => Promise<{ items: EventCardItem[], nextCursor: string | null }>
  title?: string
  emptyMessage?: string
}
```

**`EventCardItem` type** (inline, no separate file):

```ts
{
  id: string
  datetime: Date | null
  title: string
  tag: string
  host: string | null
  cancelledAt?: Date | null
  isDraft?: boolean
  photoUrl?: string | null
  church: { name: string } | null
}
```

**Behaviour:**

- `useState` holds `items` and `cursor`
- `useTransition` provides `isPending` + `startTransition`
- `loadingRef = useRef(false)` guards against concurrent loads (IntersectionObserver callbacks close over stale `isPending` — ref is the correct primitive here)
- `useEffect` runs when `cursor` changes: if `cursor` is null, skip setup; otherwise attach `IntersectionObserver` to a sentinel `<div>` at the bottom of the list
- When sentinel enters viewport: set `loadingRef.current = true`, call `startTransition(async () => { const result = await loadMore(cursor); setItems(prev => [...prev, ...result.items]); setCursor(result.nextCursor); loadingRef.current = false; })`
- Effect cleanup: `observer.unobserve(sentinel)`
- When `initialItems.length === 0` and `nextCursor === null`: render `<EmptyState>` with `emptyMessage`
- When `isPending`: show a single `<Skeleton className="h-24 w-full rounded-2xl" />` below the last item

**Pattern source:** Next.js 16.2.2 mutating-data docs — `useEffect` + `startTransition` + Server Action explicitly cited for infinite scrolling.

### Layer 4 — Page changes

Each Server Component page:

1. Calls the `*Paged(null)` data function for the first page
2. Passes `initialItems`, `initialCursor`, and the relevant Server Action as `loadMore` prop to `InfiniteEventList`

Server Actions are passed as props — confirmed idiomatic in Next.js 16 docs.

**Home page:**

- `getEvents()` call replaced by `getEventsPaged(null)`
- `<EventList>` replaced by `<InfiniteEventList title="Upcoming Events" loadMore={loadMoreEventsAction} ...>`

**My Events page:**

- `getUserAttendedEvents()` / `getUserAttendedPastEvents()` replaced by paged variants
- Props flow: `page.tsx` → `MyEventsTabs` → `MyEventsTab` (upcoming) + `MyEventsTab` (past)
- `MyEventsTab` receives `initialItems`, `initialCursor`, `loadMore` and renders `InfiniteEventList`

**Organiser page:**

- `getEventsByCreator()` / `getEventsNotByCreator()` replaced by paged variants
- `MyContentTab` events section uses `InfiniteEventList`; series section unchanged
- `CommunityTab` events section uses `InfiniteEventList`; series section unchanged

---

## Deletions

- `components/event-list.tsx` — becomes unused after home page switches to `InfiniteEventList`

---

## What does not change

- `EventCard` component — unchanged
- Series sections in Organiser — unchanged
- Search results on Home — unchanged (all results shown, no scroll)
- Church detail events tab — deferred
- Existing flat data functions — kept (referenced by tests)
- All cache tag invalidation logic — unchanged; `cacheTag("events-list")` etc. still bust the right entries

---

## Testing

Existing tests cover the data functions and server actions. New tests needed:

- `getEventsPaged` — returns correct slice + nextCursor when more exist; returns `nextCursor: null` when at end; cursor skips correctly
- Same for the other four paged functions
- `loadMoreEventsAction` — returns data; no auth required
- `loadMoreMyUpcomingEventsAction` — returns empty + null cursor when unauthenticated
- `InfiniteEventList` — unit tests: renders initial items; shows empty state when empty; calls `loadMore` when sentinel intersects; appends items; stops when `nextCursor` is null
