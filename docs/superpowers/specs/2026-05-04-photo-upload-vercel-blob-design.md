# Photo Upload: Replace Uploadthing with Vercel Blob

**Date:** 2026-05-04
**Branch:** replace-vercel
**Status:** Approved

## Context

The app currently uses Uploadthing for all photo uploads. This spec covers replacing it entirely with Vercel Blob (direct client upload) and native shadcn UI components. All users upload on mobile devices.

Three upload contexts exist:
- `profile` — profile photo, any authenticated user, set during onboarding
- `cover` — event/series cover photo, `ORGANISER` or `ADMIN` role only

Three DB fields store URLs: `User.image`, `Event.photoUrl`, `Series.photoUrl`.

## Architecture

### Upload Flow

```
Browser                    Next.js                    Vercel Blob
  │                          │                             │
  │─── POST /api/upload ────▶│                             │
  │    { filename,           │── generateClientTokens() ──▶│
  │      contentType,        │◀─ { token, url } ──────────│
  │      variant, fileSize } │                             │
  │◀─── { token, url } ──────│                             │
  │                          │                             │
  │─── PUT (direct) ────────────────────────────────────▶ │
  │◀─── blob URL ──────────────────────────────────────── │
  │                          │                             │
  │    onUploadComplete()    │                             │
  │    save URL to form      │                             │
```

### Delete Flow

Server action calls `del(url)` from `@vercel/blob` directly — no client token needed.

## Components

### `PhotoUploadField`

Single unified component replacing `components/photo-upload-field.tsx`, `lib/uploadthing.ts`, and the inline `UploadButton` in the onboarding form.

```tsx
<PhotoUploadField
  variant="profile" | "cover"
  value={url}                              // string | undefined
  onChange={(url: string | undefined) => field.onChange(url)}  // undefined = removed
/>
```

**States:**

| State | UI |
|---|---|
| Idle | Full-width tappable shadcn `Card` (dashed border). Tap anywhere → native file picker. shadcn `Button` as visible CTA. |
| Drag-over (desktop) | Card border highlight via `cn()` |
| Uploading | shadcn `Progress` bar + filename label |
| Complete | `next/image` preview + full-width ghost destructive shadcn `Button` to remove |
| Error | Inline error text (same pattern as existing form field errors) + retry button |

**Mobile-first considerations:**
- Full-width tappable area — no hover-only affordances
- Min 44px touch targets on all interactive elements
- `accept="image/*"` on hidden `<input>` — OS presents native camera + gallery picker
- No `capture` attribute — avoids locking to camera-only
- Remove button is full-width below preview, easy to tap
- `Progress` is prominent — mobile connections are slower
- All interactive states use `active:` and `focus-visible:`, not `hover:`

**Implementation notes:**
- Hidden `<input type="file" accept="image/*" />` driven by `useRef`
- Drag events on the `Card` for desktop enhancement only
- No new dependencies beyond `@vercel/blob`

`lib/uploadthing.ts` — deleted.

## API & Server Layer

### `app/api/upload/route.ts` (new)

```
POST /api/upload
Body: { filename: string, contentType: string, variant: "profile" | "cover", fileSize: number }
Returns: { url: string, token: string }
Errors: 401 unauthenticated, 403 insufficient role, 400 invalid file
```

- Validates session — 401 if unauthenticated
- `cover` variant requires `ORGANISER` or `ADMIN` — 403 otherwise
- `contentType` must match `image/*` — 400 if not
- `fileSize` must be ≤ 4MB (4,194,304 bytes) — 400 if exceeded
- Calls `handleUpload()` from `@vercel/blob/next` to generate client token
- Blob pathname: `{variant}/{userId}/{timestamp}-{filename}`

### `lib/actions/upload.ts` (updated)

`deleteUploadedFileAction` replaces `utapi.deleteFiles()` with `del(url)` from `@vercel/blob`.

URL domain whitelist changes from `utfs.io`/`ufs.sh` to `*.public.blob.vercel-storage.com`.

Auth check: `ORGANISER` or `ADMIN` required (prevents IDOR — blob URLs are public so any-user gate would allow deleting others' assets).

### `app/api/uploadthing/` — deleted entirely

## Configuration

### `next.config.ts`

Swap Uploadthing image domains:
```ts
// Remove:
{ hostname: "utfs.io" }
{ hostname: "*.ufs.sh" }

// Add:
{ hostname: "*.public.blob.vercel-storage.com" }
```

### `package.json`

Remove: `@uploadthing/react`, `uploadthing`
Add: `@vercel/blob` (if not already present)

### Environment Variables

Remove: `UPLOADTHING_APP_ID`, `UPLOADTHING_TOKEN`
Add: `BLOB_READ_WRITE_TOKEN` (from Vercel dashboard → Storage → Blob)

## Error Handling

### Client-side (before network request)
- Non-image file selected → inline error, no upload attempt
- File >4MB → inline error, no upload attempt

### Client-side (after network request)
- Upload failure → inline error + retry button (re-triggers same file)
- Delete failure → inline error, preview stays visible (no optimistic removal)

### Server-side
- All errors return `{ error: string }` JSON shape
- Belt-and-suspenders: file type and size validated server-side even if client checks pass

## Testing

`components/__tests__/photo-upload-field.test.tsx` — rewritten:
- Mock `fetch` (for `/api/upload` token request) and `@vercel/blob/client` `upload()` instead of Uploadthing components
- Same scenarios: upload completion, deletion, error states
- Add: file size rejection (client-side), file type rejection (client-side), tap-to-open file picker

## Files Changed

| File | Action |
|---|---|
| `components/photo-upload-field.tsx` | Rewrite |
| `lib/uploadthing.ts` | Delete |
| `lib/actions/upload.ts` | Update (swap delete impl + domain whitelist) |
| `app/api/upload/route.ts` | New |
| `app/api/uploadthing/core.ts` | Delete |
| `app/api/uploadthing/route.ts` | Delete |
| `next.config.ts` | Update image domains |
| `package.json` | Remove uploadthing deps, add @vercel/blob |
| `.env.example` | Swap env vars |
| `components/__tests__/photo-upload-field.test.tsx` | Rewrite |
| `app/(onboarding)/onboarding/_components/onboarding-form.tsx` | Update to use new component |
| `app/(app)/events/create/_components/steps/step-basics.tsx` | No change (already uses PhotoUploadField) |
| `app/(app)/series/create/_components/create-series-form.tsx` | No change (already uses PhotoUploadField) |
