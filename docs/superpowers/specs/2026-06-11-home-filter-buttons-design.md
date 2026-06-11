---
name: home-filter-buttons
description: Replace home page line tabs with separate outline Button filters; add Saved filter; remove Saved from My Events page
metadata:
  type: project
---

# Home Page Filter Buttons Redesign

## Goal

Replace the line-variant Radix Tabs on the home page with three separate shadcn `Button` outline components. Add "Saved" events as a third filter. Move "Saved" off the My Events page — it lives only on the home page.

## Behaviour

### Unauthenticated users
No buttons rendered. All events (`otherPage`) displayed directly as an `InfiniteEventList`. No state, no chrome.

### Authenticated users
Three separate, individually-rounded outline buttons with a gap between them:

```
[ Your churches ]  [ All events ]  [ Saved ]
```

- Default active: `"followed"` if `followedPage.items.length > 0`, else `"other"` (same server-side logic as current)
- Active button fills with primary colour via `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` on each Button
- Buttons are sticky at the top of the scroll area with `backdrop-blur-sm`, same as current tabs

## Data

### Home page (`app/(app)/(with-nav)/page.tsx`)
- Add `getMySavedEventsPaged(userId, null)` to the existing `Promise.all`, guarded by `!hasFilters && userId`
- Falls back to `{ items: [], nextCursor: null }` when no user or filters are active
- Pass `savedPage` and `loadMoreMySavedEventsAction` as new props to `HomeEventTabs`

### My Events page (`app/(app)/(with-nav)/my-events/page.tsx`)
- Remove `getMySavedEventsPaged` from `Promise.all`
- Remove `savedItems` / `savedCursor` from props passed to `MyEventsTabs`

## Components

### `domains/events/components/home-event-tabs.tsx` (modify)

**Props added:**
```ts
savedPage: { items: EventCardItem[]; nextCursor: string | null };
loadMoreSaved: LoadMoreFn;
```

**Props added:**
```ts
defaultFilter: "followed" | "other";  // renamed from defaultTab
savedPage: { items: EventCardItem[]; nextCursor: string | null };
loadMoreSaved: LoadMoreFn;
```

**Implementation:**
- Remove all `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and usage
- Add three shadcn `Button` components (`variant="outline"`, `type="button"`, `aria-pressed`)
- `type ActiveFilter = "followed" | "other" | "saved"` — internal state type
- `useState<ActiveFilter>` initialised from `defaultFilter` prop
- Active styling via `data-state` attribute + `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` className
- `aria-pressed={active === value}` on each button for accessibility
- Unauthenticated path: render `otherPage` `InfiniteEventList` directly, no buttons
- Authenticated path: render 3 buttons + one `InfiniteEventList` for the active value (conditional render)

> **Note:** `ToggleGroup` was considered but renders items as `role="radio"` with `type="single"`, which conflicts with the expected `role="button"` semantics. Plain `Button` components with `aria-pressed` are the correct accessible pattern for a toolbar-style single-select.

### `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx` (modify)
- Remove `savedItems` / `savedCursor` props
- Remove "Saved" `TabsTrigger` and `TabsContent`
- Remove `MySavedTab` import

### `app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx` (delete)
- File no longer needed; saved events live on the home page only

## Files Changed

| File | Action |
|------|--------|
| `app/(app)/(with-nav)/page.tsx` | Add saved fetch + props |
| `domains/events/components/home-event-tabs.tsx` | Replace Tabs with Button filters, add Saved |
| `app/(app)/(with-nav)/my-events/page.tsx` | Remove saved fetch + props |
| `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx` | Remove Saved tab |
| `app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx` | Delete |

## Out of Scope
- No changes to event card, search/filter UI, or other pages
- No new server actions needed — `loadMoreMySavedEventsAction` already exists
