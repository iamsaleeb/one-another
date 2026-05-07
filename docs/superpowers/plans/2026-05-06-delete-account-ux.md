# Delete Account UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move delete account behind a dedicated `/profile/account` route so it can't be triggered accidentally from the main profile page.

**Architecture:** The profile page gets a new "Account" card with a single `Delete Account` row linking to `/profile/account`. That page is a server component containing a static consequence list and a client-side `DeleteAccountForm` (controlled input + form submit). The existing `deleteAccountAction` server action is reused unchanged.

**Tech Stack:** Next.js App Router, shadcn/ui (`Button`, `Input`, `Label`), lucide-react, TypeScript

---

## File Map

| Action | File |
|--------|------|
| Create | `app/(app)/profile/account/_components/delete-account-form.tsx` |
| Create | `app/(app)/profile/account/page.tsx` |
| Delete | `app/(app)/profile/_components/delete-account-button.tsx` |
| Modify | `app/(app)/profile/page.tsx` |

---

### Task 1: Create `DeleteAccountForm` client component

**Files:**
- Create: `app/(app)/profile/account/_components/delete-account-form.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/actions/auth";

const CONFIRM_PHRASE = "delete my account";

export function DeleteAccountForm() {
  const [confirmValue, setConfirmValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmValue.toLowerCase() === CONFIRM_PHRASE;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfirmed || isPending) return;
    startTransition(async () => {
      await deleteAccountAction();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white shadow-card p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-delete" className="text-sm text-muted-foreground">
          Type{" "}
          <span className="font-semibold text-foreground">{CONFIRM_PHRASE}</span>{" "}
          to confirm
        </Label>
        <Input
          id="confirm-delete"
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoComplete="off"
          spellCheck={false}
          disabled={isPending}
        />
      </div>
      <Button
        type="submit"
        variant="destructive"
        className="w-full"
        disabled={!isConfirmed || isPending}
      >
        {isPending ? "Deleting…" : "Delete My Account"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors relating to this file.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/profile/account/_components/delete-account-form.tsx
git commit -m "feat: add DeleteAccountForm client component"
```

---

### Task 2: Create `/profile/account` page

**Files:**
- Create: `app/(app)/profile/account/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { Metadata } from "next";
import { TriangleAlert } from "lucide-react";
import { DeleteAccountForm } from "./_components/delete-account-form";

export const metadata: Metadata = {
  title: "Delete Account — One Another",
};

export default function DeleteAccountPage() {
  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
            <TriangleAlert className="w-6 h-6 text-destructive" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">Delete Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Consequence list */}
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-destructive">What will be deleted:</p>
          <ul className="flex flex-col gap-1.5">
            {[
              "Event registrations",
              "Church and series follows",
              "Notification preferences",
              "Your profile and account",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-destructive mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-1">
            Events and series you created will remain but will no longer be linked to you.
          </p>
        </div>

        {/* Inline confirmation form */}
        <DeleteAccountForm />
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

- [ ] **Step 3: Manually verify the page renders**

Start dev server (`npm run dev`), navigate to `/profile/account`. Verify:
- Icon + title + subtitle render at top
- Consequence list shows all 4 items + the note about events
- Input field renders; Delete button is disabled by default
- Typing "delete my account" exactly enables the button
- Typing anything else keeps it disabled

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profile/account/page.tsx"
git commit -m "feat: add /profile/account delete account page"
```

---

### Task 3: Update profile page — add Account card, remove Danger Zone

**Files:**
- Modify: `app/(app)/profile/page.tsx`
- Delete: `app/(app)/profile/_components/delete-account-button.tsx`

- [ ] **Step 1: Update the lucide-react import in `app/(app)/profile/page.tsx`**

Replace:
```tsx
import { Bell, CalendarDays, ChevronRight, Info, KeyRound, LogOut, Phone, ScrollText, Settings, Shield, Tag, UserPen } from "lucide-react";
```

With:
```tsx
import { Bell, CalendarDays, ChevronRight, Info, KeyRound, LogOut, Phone, ScrollText, Settings, Shield, Tag, UserCog, UserPen, UserX } from "lucide-react";
```

- [ ] **Step 2: Remove the `DeleteAccountButton` import**

Remove this line:
```tsx
import { DeleteAccountButton } from "./_components/delete-account-button";
```

- [ ] **Step 3: Replace the Danger Zone card with the new Account card**

Remove:
```tsx
{/* Danger zone */}
<DeleteAccountButton />
```

Add in its place (keep between Sign Out form and end of the flex column):
```tsx
{/* Account */}
<div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
  <div className="px-4 py-3 flex items-center gap-2">
    <UserCog className="w-3.5 h-3.5 text-primary" />
    <span className="text-sm font-semibold">Account</span>
  </div>
  <Link href="/profile/account">
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <UserX className="w-3.5 h-3.5 text-destructive" />
        <span className="text-sm font-medium text-destructive">Delete Account</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </Link>
</div>
```

- [ ] **Step 4: Delete the old button component**

```bash
git rm "app/(app)/profile/_components/delete-account-button.tsx"
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manually verify profile page**

Navigate to `/profile`. Verify:
- No Danger Zone card visible
- New "Account" section appears with "Delete Account" row in destructive color
- Tapping the row navigates to `/profile/account`
- The rest of the profile page is unchanged

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/profile/page.tsx"
git commit -m "feat: replace danger zone card with Account settings card linking to /profile/account"
```
