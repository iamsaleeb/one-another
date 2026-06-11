---
name: home-filter-buttons
description: Replace home page line tabs with separate ToggleGroup buttons; add Saved filter; remove Saved from My Events page
metadata:
  type: project
---

# Home Page Filter Buttons Redesign

## Goal

Replace the line-variant Radix Tabs on the home page with three separate shadcn `ToggleGroup` outline buttons. Add "Saved" events as a third filter. Move "Saved" off the My Events page — it lives only on the home page.

## Behaviour

### Unauthenticated users
No buttons rendered. All events (`otherPage`) displayed directly as an `InfiniteEventList`. No state, no chrome.

### Authenticated users
Three separate, individually-rounded outline buttons with a gap between them:

```
[ Your churches ]  [ All events ]  [ Saved ]
```

- Default active: `"followed"` if `followedPage.items.length > 0`, else `"other"` (same server-side logic as current)
- Active button fills with accent colour via `data-[state=on]` styles from existing toggle variants
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

**Implementation:**
- Remove all `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and usage
- Add `ToggleGroup`, `ToggleGroupItem` from `@/components/ui/toggle-group`
- `useState<"followed" | "other" | "saved">` initialised from `defaultTab` prop
- `ToggleGroup` props: `type="single"`, `variant="outline"`, `spacing={2}`
- Unauthenticated path: render `otherPage` `InfiniteEventList` directly (no change in output)
- Authenticated path: render toggle group + one `InfiniteEventList` for the active value

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
| `domains/events/components/home-event-tabs.tsx` | Replace Tabs with ToggleGroup, add Saved |
| `app/(app)/(with-nav)/my-events/page.tsx` | Remove saved fetch + props |
| `app/(app)/(with-nav)/my-events/_components/my-events-tabs.tsx` | Remove Saved tab |
| `app/(app)/(with-nav)/my-events/_components/my-saved-tab.tsx` | Delete |

## Out of Scope
- No changes to event card, search/filter UI, or other pages
- No new server actions needed — `loadMoreMySavedEventsAction` already exists
