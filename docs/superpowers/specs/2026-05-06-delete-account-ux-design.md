# Delete Account UX — Design Spec
**Date:** 2026-05-06

## Problem

The "Delete Account" button is too accessible on the profile page — a prominent Danger Zone card makes it easy to trigger accidentally. Real apps (Google, Apple) hide destructive account actions behind a dedicated screen.

## Solution

Move delete account behind a dedicated route `/profile/account`. The profile page gets a clean "Account" card row as the entry point; the dedicated page hosts the full inline confirmation form.

## Profile Page Changes

Remove `<DeleteAccountButton />` and the Danger Zone card entirely.

Add a new **Account card** (same style as Settings/Legal: `rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden`) positioned between the About card and the Sign Out button. Contains one row:

- Icon: `UserX` (lucide-react), destructive color
- Label: "Delete Account", destructive color  
- Trailing: `ChevronRight`
- Navigates to: `/profile/account`

No warning text or red borders on the profile page — friction comes from navigation, not visual alarm.

## `/profile/account` Page

**Route:** `app/(app)/profile/account/page.tsx` — server component

### Layout (top to bottom)

1. **Header section**
   - `TriangleAlert` icon
   - Title: "Delete Account"
   - Subtitle: "This action is permanent and cannot be undone."

2. **Consequence list card** (`rounded-2xl bg-destructive/5 border border-destructive/20`)
   - Static list of what gets deleted:
     - Event registrations
     - Church and series follows
     - Notification preferences
     - Your profile and account
   - Note: "Events and series you created will remain but will no longer be linked to you."

3. **Confirmation form card** (client component)
   - `Label`: Type **delete my account** to confirm
   - `Input` (shadcn) — controlled, phrase match, `autoComplete="off"`, `spellCheck={false}`
   - `Button variant="destructive"` — disabled until phrase matches and not pending; shows "Deleting…" while pending

No dialog on this page. The page itself is the confirmation screen.

## File Changes

| Action | File |
|--------|------|
| Create | `app/(app)/profile/account/page.tsx` |
| Create | `app/(app)/profile/account/_components/delete-account-form.tsx` |
| Delete | `app/(app)/profile/_components/delete-account-button.tsx` |
| Update | `app/(app)/profile/page.tsx` |

## Data / Actions

No changes to `deleteAccountAction` in `lib/actions/auth.ts` — reused as-is.

## Shadcn Components Used

`Input`, `Label`, `Button` — all already in use. No new installs needed.
