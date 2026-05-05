# Custom Questions — Design Spec

**Date:** 2026-05-05  
**Branch:** custom-questions  
**Status:** Approved

---

## Overview

Allow event organisers to attach custom questions to any event. Questions appear to attendees when they register or confirm attendance (all events, not just registration-required ones). Organiser can view collected responses in a dedicated table view.

---

## 1. Data Model

Three new Prisma models and one new enum.

### `QuestionType` enum

```prisma
enum QuestionType {
  SHORT_TEXT
  LONG_TEXT
  YES_NO
  MULTIPLE_CHOICE
  FILE_UPLOAD
}
```

### `QuestionLibraryItem`

Stores questions an organiser has previously used, enabling reuse across events.

```prisma
model QuestionLibraryItem {
  id          String          @id @default(cuid())
  createdById String
  createdBy   User            @relation("UserQuestionLibrary", fields: [createdById], references: [id], onDelete: Cascade)
  type        QuestionType
  label       String
  options     String[]        // MULTIPLE_CHOICE options only; empty for other types
  createdAt   DateTime        @default(now())
  questions   EventQuestion[]

  @@unique([createdById, label, type])
}
```

### `EventQuestion`

Represents a question attached to a specific event. Copies `type`, `label`, and `options` from the library item at creation time — editing the library item does not retroactively affect existing events.

```prisma
model EventQuestion {
  id            String               @id @default(cuid())
  eventId       String
  event         Event                @relation(fields: [eventId], references: [id], onDelete: Cascade)
  libraryItemId String?              // null = created fresh; non-null = sourced from library
  libraryItem   QuestionLibraryItem? @relation(fields: [libraryItemId], references: [id], onDelete: SetNull)
  type          QuestionType
  label         String
  options       String[]             // MULTIPLE_CHOICE options; empty for other types
  required      Boolean              @default(false)
  order         Int                  // 0-based display order
  responses     EventAttendeeResponse[]
}
```

### `EventAttendeeResponse`

One row per attendee per question. Unique constraint enables clean upsert for edited responses.

```prisma
model EventAttendeeResponse {
  id              String        @id @default(cuid())
  eventAttendeeId String
  eventAttendee   EventAttendee @relation(fields: [eventAttendeeId], references: [id], onDelete: Cascade)
  questionId      String
  question        EventQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answer          String?       // Text, "true"/"false" for YES_NO, selected option for MULTIPLE_CHOICE
  fileUrl         String?       // Vercel Blob URL for FILE_UPLOAD questions
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([eventAttendeeId, questionId])
}
```

### Existing model changes

- `Event` gains `questions EventQuestion[]`
- `EventAttendee` gains `responses EventAttendeeResponse[]`
- `User` gains `questionLibrary QuestionLibraryItem[] @relation("UserQuestionLibrary")`

### Key decisions

- **Copy on creation:** `EventQuestion` always stores its own `type`/`label`/`options`. The `libraryItemId` backlink is informational only. This prevents silent mutation of past events when a library item is edited.
- **Single `answer` string:** All non-file answer types use `answer String?`. YES_NO stores `"true"`/`"false"`. MULTIPLE_CHOICE stores the selected option label. Avoids a polymorphic column structure.
- **Upsert via unique constraint:** `@@unique([eventAttendeeId, questionId])` means response editing is a simple Prisma `upsert` — no separate update path needed.

---

## 2. Event Creation Wizard — Questions Step

### Wizard step order (updated)

1. Basics
2. When & Where
3. Registration
4. **Questions** ← new
5. Camp Details *(conditional on tag === "Camp")*
6. Review

The Questions step always appears regardless of `requiresRegistration` — questions are supported for all events.

### New files

- `app/(app)/events/create/_components/steps/step-questions.tsx`

### Step behaviour

- Renders the current list of questions as shadcn `Card` components
- Each card shows: question label, shadcn `Badge` for type, shadcn `Switch` for required toggle, up/down arrow shadcn `Button`s (ghost, icon) for reorder, delete shadcn `Button` (ghost, destructive icon)
- Reorder uses up/down buttons — no drag-and-drop (poor UX on mobile touch)
- "Add question" button opens the **Question Drawer**

### Question Drawer (add/edit)

A shadcn `Drawer` (bottom sheet, mobile-native) containing a shadcn `Form` with:

| Field | Component | Notes |
|-------|-----------|-------|
| Label | shadcn `Input` | Required |
| Type | shadcn `Select` | SHORT_TEXT, LONG_TEXT, YES_NO, MULTIPLE_CHOICE, FILE_UPLOAD |
| Required | shadcn `Switch` | Defaults off |
| Options | shadcn `Input` list + add/remove `Button`s | Shown only when type === MULTIPLE_CHOICE |
| Pick from library | shadcn `Button` | Opens Library Drawer |

### Library Drawer

A second shadcn `Drawer` (stacked over Question Drawer) with:
- shadcn `Input` for search/filter
- Scrollable list of `Button` rows — each shows label + type `Badge`
- Tapping a row closes the Library Drawer and pre-fills the Question Drawer fields

### Question library upsert

On event save/publish, for each `EventQuestion`, upsert a `QuestionLibraryItem` keyed on `(createdById, label, type)`. This prevents duplicate library entries for identical questions across events.

### Zod schema extension

`createEventSchema` and `saveDraftSchema` in `lib/validations/event.ts` gain a `questions` array:

```typescript
const questionSchema = z.object({
  id: z.string().optional(),         // cuid if already persisted
  type: z.nativeEnum(QuestionType),
  label: z.string().min(1),
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  libraryItemId: z.string().optional(),
});
```

Draft saves allow empty `questions` arrays. Questions are managed via `useFieldArray` from react-hook-form, consistent with the existing camp agenda pattern.

### STEP_FIELDS update

`STEP_FIELDS` in `event-wizard.tsx` gains a new entry for the questions step: `["questions"]`.

---

## 3. Attendee Flow — Answering Questions

### Trigger

- **Quick attend** (no `requiresRegistration`): if the event has custom questions, tapping "I'm going" opens the registration `Drawer` showing the questions form before confirming attendance. If no questions, existing single-tap behaviour is unchanged.
- **Registration** (`requiresRegistration: true`): custom questions appear below the existing phone/notes fields in the registration `Drawer`.

### Question rendering per type

| Type | shadcn Component |
|------|-----------------|
| SHORT_TEXT | `Input` |
| LONG_TEXT | `Textarea` |
| YES_NO | `Switch` with "Yes / No" label |
| MULTIPLE_CHOICE | `RadioGroup` with `RadioGroupItem` per option |
| FILE_UPLOAD | `Button` triggering native file picker; shows filename + remove button once selected |

All wrapped in standard shadcn `FormField` / `FormItem` / `FormLabel` / `FormMessage`.

### Validation

Zod schema for the response form is built dynamically from the event's `questions` array at render time. Required questions use `z.string().min(1)` (or `z.literal("true")` for YES_NO). Optional questions use `.optional()`. File upload validates max 10MB client-side before upload.

### Submission

1. FILE_UPLOAD responses: upload to Vercel Blob first, store returned URL
2. Upsert `EventAttendeeResponse` rows for all questions in a single Prisma transaction
3. Create/update `EventAttendee` record in the same transaction

`registerEventAction` and `attendEventAction` in `lib/actions/events-attendance.ts` are extended to accept and persist responses.

### Editing responses

The attend/register button is relabelled "Update response" if the user has already attended and the event has questions. The form pre-fills from existing `EventAttendeeResponse` rows. Submission upserts via `@@unique([eventAttendeeId, questionId])`. Attendees can edit until the event's `datetime`.

---

## 4. Organiser Responses View

### Attendees drawer (minimal change)

If the event has questions, each attendee row in the existing `attendees-drawer.tsx` gains a small shadcn `Badge` — "Answered" (green) if all required questions answered, "Partial" (yellow) if some skipped. No other layout changes.

### Responses page

**Route:** `app/(app)/events/[id]/responses/page.tsx`

Access-controlled: same organiser role checks used elsewhere in the app (ORGANISER or ADMIN role, scoped to the event's church via `canManageChurch`). Non-organisers get a redirect to the event detail page.

**Link:** A shadcn `Button` (outline, "View responses") on the event detail page, visible only to organisers.

**Layout:**

- Server component — fetches all `EventAttendeeResponse` rows for the event joined with attendee user data and question labels in a single Prisma query
- Horizontally scrollable shadcn `Table`
- Rows: attendees (name + avatar in first column)
- Columns: one per question (question label as header)
- Cell values:
  - Text: truncated string with full value in `title` attribute
  - YES_NO: shadcn `Badge` ("Yes" / "No")
  - MULTIPLE_CHOICE: plain text (selected option)
  - FILE_UPLOAD: shadcn `Button` ("View file") linking to Vercel Blob URL, `target="_blank"`
  - Empty/skipped: `—`
- CSV export `Button` (top-right): client-side serialisation of visible table data, no server action needed
- No pagination — events rarely have attendee counts that require it

---

## 5. File Uploads

- Uses existing Vercel Blob setup (same as event photo uploads)
- Client-side 10MB size cap before upload attempt
- Files stored at path: `responses/{eventId}/{attendeeId}/{questionId}`
- Overwrite on re-upload (same path = natural upsert)
- No deletion of old Blob files when response is updated — acceptable for now (orphaned files are low-cost)

---

## 6. Permissions & Access Control

| Action | Who |
|--------|-----|
| Create/edit questions on event | ORGANISER or ADMIN, via existing `canManageChurch` checks |
| Answer questions | Any authenticated user attending/registering |
| Edit own responses | The attendee themselves, before event datetime |
| View responses page | ORGANISER or ADMIN of the event |
| Export CSV | ORGANISER or ADMIN of the event |

No new permission primitives needed — existing role checks cover all cases.

---

## 7. Out of Scope

- Conditional questions (show question B only if question A = "Yes")
- Question analytics / charts
- Organiser editing questions after the first response is submitted (blocked to avoid orphaned responses — questions are editable on the event edit page only while `responses` count === 0)
- Deleting individual responses on behalf of attendees
- File upload deletion from Vercel Blob on response update
