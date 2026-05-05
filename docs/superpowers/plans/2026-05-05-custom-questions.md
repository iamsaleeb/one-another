# Custom Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow event organisers to attach typed custom questions to any event; attendees answer when attending or registering; organisers view responses in a dedicated table.

**Architecture:** Three new Prisma models (`QuestionLibraryItem`, `EventQuestion`, `EventAttendeeResponse`) hold questions and answers relationally. Questions are managed in a new wizard step and saved via the existing event CRUD server actions. Responses are submitted alongside the existing attendance/registration actions via FormData. A new `/events/[id]/responses` page renders a shadcn Table for organisers.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL, react-hook-form + Zod, shadcn/ui, Vercel Blob (`@vercel/blob/client`), TypeScript

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/validations/questions.ts` | `QuestionType` zod enum, `questionSchema`, `responseInputSchema` |
| Modify | `lib/validations/event.ts` | Add `questions` array field to `createEventSchema` + `saveDraftSchema` |
| Modify | `prisma/schema.prisma` | New enum + 3 new models + relations on existing models |
| Create | `lib/dal/questions.ts` | `syncEventQuestions`, `getQuestionLibraryForUser` |
| Create | `lib/dal/responses.ts` | `saveResponses` (upsert `EventAttendeeResponse` rows) |
| Modify | `lib/dal/events.ts` | Strip `questions` from event data; call `syncEventQuestions` after create/update |
| Modify | `lib/dal/attendance.ts` | Extend `registerEvent` to call `saveResponses`; add `attendWithResponses` |
| Create | `lib/actions/data-questions.ts` | Cached `getEventQuestions`, `getQuestionLibrary`, `getEventResponses` |
| Modify | `lib/actions/events-attendance.ts` | Extend `registerEventAction`; add `attendWithQuestionsAction` |
| Modify | `app/api/upload/route.ts` | Accept `"response"` clientPayload (any authenticated user) |
| Create | `app/(app)/events/create/_components/steps/library-drawer.tsx` | Library picker bottom sheet |
| Create | `app/(app)/events/create/_components/steps/question-drawer.tsx` | Add/edit question bottom sheet |
| Create | `app/(app)/events/create/_components/steps/step-questions.tsx` | Questions wizard step |
| Modify | `app/(app)/events/create/_components/event-wizard.tsx` | Insert Questions step, update `STEP_FIELDS` |
| Create | `app/(app)/events/[id]/_components/questions-form.tsx` | Per-type question field renderer for attendees |
| Modify | `app/(app)/events/[id]/_components/registration-drawer.tsx` | Render questions form + submit responses |
| Modify | `app/(app)/events/[id]/_components/event-action-bar.tsx` | Accept `questions` + `existingResponses` props; open drawer for quick-attend-with-questions |
| Modify | `app/(app)/events/[id]/page.tsx` | Fetch questions + my responses; add View Responses button |
| Modify | `app/(app)/events/[id]/_components/attendees-drawer.tsx` | Show Answered/Partial badge per attendee |
| Create | `app/(app)/events/[id]/responses/page.tsx` | Organiser responses page (server component) |
| Create | `app/(app)/events/[id]/responses/_components/responses-table.tsx` | shadcn Table with attendees × questions |
| Create | `app/(app)/events/[id]/responses/_components/csv-export-button.tsx` | Client-side CSV download |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enum and three new models to schema.prisma**

Open `prisma/schema.prisma` and add after the existing `Cadence` enum and before the `User` model:

```prisma
enum QuestionType {
  SHORT_TEXT
  LONG_TEXT
  YES_NO
  MULTIPLE_CHOICE
  FILE_UPLOAD
}
```

Add after the `EventAttendee` model:

```prisma
model QuestionLibraryItem {
  id          String          @id @default(cuid())
  createdById String
  createdBy   User            @relation("UserQuestionLibrary", fields: [createdById], references: [id], onDelete: Cascade)
  type        QuestionType
  label       String
  options     String[]
  createdAt   DateTime        @default(now())
  questions   EventQuestion[]

  @@unique([createdById, label, type])
  @@index([createdById])
}

model EventQuestion {
  id            String                  @id @default(cuid())
  eventId       String
  event         Event                   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  libraryItemId String?
  libraryItem   QuestionLibraryItem?    @relation(fields: [libraryItemId], references: [id], onDelete: SetNull)
  type          QuestionType
  label         String
  options       String[]
  required      Boolean                 @default(false)
  order         Int
  responses     EventAttendeeResponse[]

  @@index([eventId])
}

model EventAttendeeResponse {
  id              String        @id @default(cuid())
  eventAttendeeId String
  eventAttendee   EventAttendee @relation(fields: [eventAttendeeId], references: [id], onDelete: Cascade)
  questionId      String
  question        EventQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answer          String?
  fileUrl         String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([eventAttendeeId, questionId])
  @@index([questionId])
}
```

Add relations to existing models:

In `User` model, add:
```prisma
  questionLibrary QuestionLibraryItem[] @relation("UserQuestionLibrary")
```

In `Event` model, add:
```prisma
  questions EventQuestion[]
```

In `EventAttendee` model, add:
```prisma
  responses EventAttendeeResponse[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_custom_questions
```

Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 3: Verify types are generated**

```bash
npx prisma generate
```

Expected: No errors. `QuestionType` enum available from `@prisma/client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add QuestionLibraryItem, EventQuestion, EventAttendeeResponse schema"
```

---

## Task 2: Question Validation Schemas

**Files:**
- Create: `lib/validations/questions.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/validations/questions.ts
import { z } from "zod";
import { QuestionType } from "@prisma/client";

export { QuestionType };

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(QuestionType),
  label: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1)).default([]),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  libraryItemId: z.string().optional(),
});

export type QuestionInput = z.infer<typeof questionSchema>;

export const responseInputSchema = z.object({
  questionId: z.string(),
  answer: z.string().nullable().optional(),
  fileUrl: z.string().url().nullable().optional(),
});

export type ResponseInput = z.infer<typeof responseInputSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/questions.ts
git commit -m "feat: add question and response input Zod schemas"
```

---

## Task 3: Extend Event Validation Schemas

**Files:**
- Modify: `lib/validations/event.ts`

- [ ] **Step 1: Add `questions` field to createEventSchema and saveDraftSchema**

In `lib/validations/event.ts`, add the import at the top:

```typescript
import { questionSchema } from "./questions";
```

In `createEventSchema`, add after `campAgenda`:

```typescript
  questions: z.array(questionSchema).optional().default([]),
```

In `saveDraftSchema`, add after the `campAgenda` override:

```typescript
  questions: z.array(questionSchema).optional().default([]),
```

The full updated `createEventSchema` object should end with:

```typescript
  campAgenda: z
    .array(
      z.object({
        id: z.string(),
        date: z.iso.date(),
        time: z.string().optional(),
        title: z.string().min(1, "Agenda item title is required"),
        description: z.string().optional(),
      })
    )
    .optional(),
  questions: z.array(questionSchema).optional().default([]),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/event.ts
git commit -m "feat: add questions field to event creation schemas"
```

---

## Task 4: Questions DAL

**Files:**
- Create: `lib/dal/questions.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/dal/questions.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { QuestionInput } from "@/lib/validations/questions";

export async function syncEventQuestions(
  eventId: string,
  questions: QuestionInput[],
  createdById: string
): Promise<void> {
  const responseCount = await prisma.eventAttendeeResponse.count({
    where: { question: { eventId } },
  });

  // Once responses exist, questions are locked — no sync
  if (responseCount > 0) return;

  await prisma.$transaction([
    prisma.eventQuestion.deleteMany({ where: { eventId } }),
    prisma.eventQuestion.createMany({
      data: questions.map((q, i) => ({
        eventId,
        type: q.type,
        label: q.label,
        options: q.options ?? [],
        required: q.required ?? false,
        order: i,
        libraryItemId: q.libraryItemId ?? null,
      })),
    }),
  ]);

  // Upsert library items for each unique (label, type) pair
  const seen = new Set<string>();
  for (const q of questions) {
    const key = `${q.type}::${q.label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.questionLibraryItem.upsert({
      where: { createdById_label_type: { createdById, label: q.label, type: q.type } },
      create: { createdById, type: q.type, label: q.label, options: q.options ?? [] },
      update: { options: q.options ?? [] },
    });
  }
}

export async function getQuestionLibraryForUser(userId: string) {
  return prisma.questionLibraryItem.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, label: true, options: true },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dal/questions.ts
git commit -m "feat: add questions DAL - syncEventQuestions and getQuestionLibraryForUser"
```

---

## Task 5: Responses DAL

**Files:**
- Create: `lib/dal/responses.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/dal/responses.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { ResponseInput } from "@/lib/validations/questions";

export async function saveResponses(
  eventAttendeeId: string,
  responses: ResponseInput[]
): Promise<void> {
  await Promise.all(
    responses.map((r) =>
      prisma.eventAttendeeResponse.upsert({
        where: { eventAttendeeId_questionId: { eventAttendeeId, questionId: r.questionId } },
        create: {
          eventAttendeeId,
          questionId: r.questionId,
          answer: r.answer ?? null,
          fileUrl: r.fileUrl ?? null,
        },
        update: {
          answer: r.answer ?? null,
          fileUrl: r.fileUrl ?? null,
        },
      })
    )
  );
}

export async function getMyResponsesForEvent(
  eventId: string,
  userId: string
): Promise<Record<string, { answer: string | null; fileUrl: string | null }>> {
  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: {
      responses: { select: { questionId: true, answer: true, fileUrl: true } },
    },
  });

  if (!attendee) return {};

  return Object.fromEntries(
    attendee.responses.map((r) => [r.questionId, { answer: r.answer, fileUrl: r.fileUrl }])
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dal/responses.ts
git commit -m "feat: add responses DAL - saveResponses and getMyResponsesForEvent"
```

---

## Task 6: Cached Data Fetching for Questions

**Files:**
- Create: `lib/actions/data-questions.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/actions/data-questions.ts
"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

export async function getEventQuestions(eventId: string) {
  cacheTag(`event-questions-${eventId}`);
  cacheLife("hours");
  return prisma.eventQuestion.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      options: true,
      required: true,
      order: true,
      libraryItemId: true,
    },
  });
}

export async function getEventResponses(eventId: string) {
  cacheTag(`event-questions-${eventId}`, `event-${eventId}`);
  cacheLife("minutes");

  const questions = await prisma.eventQuestion.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, label: true, type: true },
  });

  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
      responses: {
        select: { questionId: true, answer: true, fileUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { questions, attendees };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/data-questions.ts
git commit -m "feat: add cached data fetching for event questions and responses"
```

---

## Task 7: Extend Events DAL to Sync Questions

**Files:**
- Modify: `lib/dal/events.ts`

- [ ] **Step 1: Import syncEventQuestions**

At the top of `lib/dal/events.ts`, add the import:

```typescript
import { syncEventQuestions } from "@/lib/dal/questions";
```

- [ ] **Step 2: Strip questions from createEvent data and sync after creation**

In `createEvent`, change the destructuring to extract `questions`:

```typescript
  const {
    title,
    date,
    time,
    datetimeISO,
    location,
    host,
    tag,
    description,
    seriesId,
    requiresRegistration,
    capacity,
    collectPhone,
    collectNotes,
    price,
    isDraft,
    photoUrl,
    campEndDate,
    campAllowPartialRegistration,
    campAgenda,
    questions,  // ← add this
  } = data;
```

After `const created = await prisma.event.create(...)`, add before the notification code:

```typescript
  if (questions && questions.length > 0) {
    try {
      await syncEventQuestions(created.id, questions, userId);
    } catch (err) {
      console.error("Failed to sync event questions:", err);
    }
  }
```

Also add `"event-questions"` invalidation. After the function, in the return statement, also invalidate the question cache. Actually the question cache uses `event-questions-${id}` so it will be invalidated when the event is revalidated — nothing extra needed here since `getEventQuestions` tags itself.

- [ ] **Step 3: Strip questions from updateEvent data and sync after update**

In `updateEvent`, change the destructuring to extract `questions`:

```typescript
  const {
    title,
    date,
    time,
    datetimeISO,
    location,
    host,
    tag,
    description,
    seriesId,
    requiresRegistration,
    capacity,
    collectPhone,
    collectNotes,
    price,
    isDraft,
    photoUrl,
    campEndDate,
    campAllowPartialRegistration,
    campAgenda,
    questions,  // ← add this
  } = data;
```

After `await prisma.event.update(...)`, before the reschedule logic, add:

```typescript
  if (questions && questions.length >= 0) {
    try {
      await syncEventQuestions(id, questions, userId);
    } catch (err) {
      console.error("Failed to sync event questions on update:", err);
    }
  }
```

- [ ] **Step 4: Invalidate question cache on event changes**

Open `lib/actions/_cache.ts`. In the `broadcastEventChange` function, add after `updateTag(\`event-${id}\`)`:

```typescript
  updateTag(`event-questions-${id}`);
```

Do the same in `invalidateEventFields`, after `updateTag(\`event-${id}\`)`:

```typescript
  updateTag(`event-questions-${id}`);
```

These are the two functions called by all event CRUD actions, so this covers create, update, publish, cancel, and delete.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dal/events.ts lib/actions/events-crud.ts lib/actions/_cache.ts
git commit -m "feat: sync event questions on event create/update"
```

---

## Task 8: Extend Upload API for Response Files

**Files:**
- Modify: `app/api/upload/route.ts`

- [ ] **Step 1: Add response variant support**

In `app/api/upload/route.ts`, update `onBeforeGenerateToken` to handle the `"response"` clientPayload:

```typescript
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();

        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const variant = clientPayload === "cover" ? "cover"
          : clientPayload === "response" ? "response"
          : "profile";

        if (variant === "cover") {
          if (
            session.user.role !== UserRole.ORGANISER &&
            session.user.role !== UserRole.ADMIN
          ) {
            throw new Error("Forbidden");
          }
        }

        // "response" variant: any authenticated user — no role check needed

        const allowedContentTypes = variant === "response"
          ? [
              "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
          : ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

        const maximumSizeInBytes = variant === "response"
          ? 10 * 1024 * 1024   // 10MB for responses
          : 4 * 1024 * 1024;   // 4MB for photos

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            variant,
          }),
        };
      },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: allow response file uploads via existing Vercel Blob token endpoint"
```

---

## Task 9: Library Drawer Component

**Files:**
- Create: `app/(app)/events/create/_components/steps/library-drawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/create/_components/steps/library-drawer.tsx
"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionType } from "@/lib/validations/questions";

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  FILE_UPLOAD: "File upload",
};

interface LibraryItem {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

interface LibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LibraryItem[];
  onSelect: (item: LibraryItem) => void;
}

export function LibraryDrawer({ open, onOpenChange, items, onSelect }: LibraryDrawerProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Pick from library</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 flex flex-col gap-3">
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {items.length === 0 ? "No saved questions yet." : "No matches found."}
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-left hover:bg-muted/50 active:bg-muted min-h-[56px]"
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-sm font-medium line-clamp-2">{item.label}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {TYPE_LABELS[item.type]}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/events/create/_components/steps/library-drawer.tsx
git commit -m "feat: add library picker drawer for question reuse"
```

---

## Task 10: Question Drawer Component

**Files:**
- Create: `app/(app)/events/create/_components/steps/question-drawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/create/_components/steps/question-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LibraryDrawer } from "./library-drawer";
import { QuestionType, type QuestionInput } from "@/lib/validations/questions";

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  FILE_UPLOAD: "File upload",
};

interface LibraryItem {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

interface QuestionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: QuestionInput | null;
  libraryItems: LibraryItem[];
  onSave: (question: Omit<QuestionInput, "order">) => void;
}

export function QuestionDrawer({
  open,
  onOpenChange,
  initial,
  libraryItems,
  onSave,
}: QuestionDrawerProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<QuestionType>(QuestionType.SHORT_TEXT);
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([""]);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setType(initial?.type ?? QuestionType.SHORT_TEXT);
      setRequired(initial?.required ?? false);
      setOptions(initial?.options?.length ? initial.options : [""]);
    }
  }, [open, initial]);

  function handleLibrarySelect(item: LibraryItem) {
    setLabel(item.label);
    setType(item.type);
    setOptions(item.options.length ? item.options : [""]);
  }

  function handleSave() {
    if (!label.trim()) return;
    const validOptions = options.filter((o) => o.trim().length > 0);
    onSave({
      id: initial?.id,
      type,
      label: label.trim(),
      options: type === QuestionType.MULTIPLE_CHOICE ? validOptions : [],
      required,
      libraryItemId: initial?.libraryItemId,
    });
    onOpenChange(false);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>{initial ? "Edit question" : "Add question"}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLibraryOpen(true)}
            >
              Pick from library
            </Button>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-label">Question</Label>
              <Input
                id="q-label"
                placeholder="e.g. Do you have any dietary requirements?"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-type">Answer type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                <SelectTrigger id="q-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === QuestionType.MULTIPLE_CHOICE && (
              <div className="flex flex-col gap-2">
                <Label>Options</Label>
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                    />
                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="size-4 mr-1" />
                  Add option
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 min-h-[56px]">
              <div>
                <p className="text-sm font-medium">Required</p>
                <p className="text-xs text-muted-foreground">Attendee must answer this question</p>
              </div>
              <Switch
                checked={required}
                onCheckedChange={setRequired}
              />
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              className="w-full"
              onClick={handleSave}
              disabled={!label.trim()}
            >
              {initial ? "Save changes" : "Add question"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <LibraryDrawer
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        items={libraryItems}
        onSelect={handleLibrarySelect}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/events/create/_components/steps/question-drawer.tsx
git commit -m "feat: add question drawer for creating/editing custom questions"
```

---

## Task 11: Step Questions Component

**Files:**
- Create: `app/(app)/events/create/_components/steps/step-questions.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/create/_components/steps/step-questions.tsx
"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { QuestionDrawer } from "./question-drawer";
import { QuestionType, type QuestionInput } from "@/lib/validations/questions";
import type { CreateEventInput } from "@/lib/validations/event";

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  FILE_UPLOAD: "File upload",
};

interface StepQuestionsProps {
  libraryItems: Array<{ id: string; type: QuestionType; label: string; options: string[] }>;
}

export function StepQuestions({ libraryItems }: StepQuestionsProps) {
  const form = useFormContext<CreateEventInput>();
  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleSave(q: Omit<QuestionInput, "order">) {
    if (editingIndex !== null) {
      update(editingIndex, { ...q, order: editingIndex });
    } else {
      append({ ...q, order: fields.length });
    }
    setEditingIndex(null);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDrawerOpen(true);
  }

  function openAdd() {
    setEditingIndex(null);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 py-4">
      <p className="text-sm font-semibold text-primary">Custom Questions</p>
      <p className="text-xs text-muted-foreground">
        Questions will be shown to attendees when they sign up or confirm attendance.
      </p>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No questions added yet.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-2 rounded-xl border bg-white px-3 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{field.label}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABELS[field.type as QuestionType]}
                </Badge>
                {field.required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                aria-label="Move up"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label="Move down"
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => openEdit(index)}
                aria-label="Edit question"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
                aria-label="Delete question"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name={`questions.${index}.required`}
            render={({ field: f }) => (
              <FormItem className="flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">Required</p>
                <FormControl>
                  <Switch
                    checked={f.value ?? false}
                    onCheckedChange={f.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={openAdd}
      >
        <Plus className="size-4 mr-1" />
        Add question
      </Button>

      <QuestionDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditingIndex(null);
        }}
        initial={editingIndex !== null ? (fields[editingIndex] as QuestionInput) : null}
        libraryItems={libraryItems}
        onSave={handleSave}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/events/create/_components/steps/step-questions.tsx
git commit -m "feat: add StepQuestions wizard step with reorder and question CRUD"
```

---

## Task 12: Update Event Wizard

**Files:**
- Modify: `app/(app)/events/create/_components/event-wizard.tsx`
- Modify: `app/(app)/events/create/page.tsx` (to fetch library items and pass to wizard)

- [ ] **Step 1: Update event-wizard.tsx**

Add import at the top:

```typescript
import { StepQuestions } from "./steps/step-questions";
import type { QuestionType } from "@/lib/validations/questions";
```

Add `QUESTIONS_STEP` constant after `CAMP_STEP`:

```typescript
const QUESTIONS_STEP = { label: "Questions" };
```

Update `activeSteps` to include Questions:

```typescript
const activeSteps = [...BASE_STEPS, QUESTIONS_STEP, ...(tag === "Camp" ? [CAMP_STEP] : []), REVIEW_STEP];
```

Update `STEP_FIELDS` to add questions at index 3:

```typescript
const STEP_FIELDS: Array<Array<keyof CreateEventInput>> = [
  ["title", "description", "tag", "churchId", "photoUrl"],
  ["date", "time", "location", "host"],
  ["price", "requiresRegistration", "capacity", "collectPhone", "collectNotes"],
  ["questions"],
  ["campEndDate", "campAllowPartialRegistration", "campAgenda"],
];
```

Add `libraryItems` to `EventWizardProps`:

```typescript
interface LibraryItem {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

interface EventWizardProps {
  churches: Church[];
  series?: Series | null;
  eventId?: string;
  defaultValues?: Partial<CreateEventInput> & { datetimeISO?: string };
  libraryItems?: LibraryItem[];
}
```

Update `renderStep` switch to add case 3 and shift camp to case 4:

```typescript
  const renderStep = () => {
    if (isReviewStep) {
      return (
        <StepReview
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          isPublishing={isPublishing}
          isSaving={isSaving}
          isDraftEvent={!!isDraft}
          churches={churches}
        />
      );
    }

    switch (currentStep) {
      case 0:
        return <StepBasics churches={churches} series={series} />;
      case 1:
        return <StepWhenWhere />;
      case 2:
        return <StepRegistration />;
      case 3:
        return <StepQuestions libraryItems={libraryItems ?? []} />;
      case 4:
        return <StepCampDetails />;
      default:
        return null;
    }
  };
```

Add `questions: []` to the default values in `useForm`:

```typescript
          questions: [],
```

- [ ] **Step 2: Update event creation page to fetch library items**

Open `app/(app)/events/create/page.tsx`. Add the library fetch:

```typescript
import { auth } from "@/auth";
import { getQuestionLibraryForUser } from "@/lib/dal/questions";
```

In the page component, fetch library items alongside churches:

```typescript
  const session = await auth();
  const [churches, series, libraryItems] = await Promise.all([
    getChurches(),
    seriesId ? getSeriesById(seriesId) : Promise.resolve(null),
    session?.user?.id ? getQuestionLibraryForUser(session.user.id) : Promise.resolve([]),
  ]);
```

Pass `libraryItems` to `EventWizard`:

```typescript
  <EventWizard
    churches={churches}
    series={series}
    libraryItems={libraryItems}
  />
```

> Note: Check the actual page.tsx for the exact variable names — adapt accordingly without changing unrelated code.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/events/create/_components/event-wizard.tsx app/(app)/events/create/page.tsx
git commit -m "feat: insert Questions step into event creation wizard"
```

---

## Task 13: Extend Attendance DAL for Responses

**Files:**
- Modify: `lib/dal/attendance.ts`

- [ ] **Step 1: Import saveResponses**

At the top of `lib/dal/attendance.ts`, add:

```typescript
import { saveResponses } from "@/lib/dal/responses";
import type { ResponseInput } from "@/lib/validations/questions";
```

- [ ] **Step 2: Extend RegisterEventData to include responses**

Update the `RegisterEventData` interface:

```typescript
export interface RegisterEventData {
  phone?: string;
  notes?: string;
  selectedDays?: string[];
  responses?: ResponseInput[];
}
```

- [ ] **Step 3: Save responses inside registerEvent after EventAttendee creation**

In `registerEvent`, after `await prisma.eventAttendee.create(...)`, add:

```typescript
  if (data.responses && data.responses.length > 0) {
    const attendeeRecord = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    if (attendeeRecord) {
      try {
        await saveResponses(attendeeRecord.id, data.responses);
      } catch (err) {
        console.error("Failed to save responses:", err);
      }
    }
  }
```

- [ ] **Step 4: Add attendWithResponses function**

Add a new exported function for quick attend with responses:

```typescript
export async function attendWithResponses(
  eventId: string,
  userId: string,
  responses: ResponseInput[]
): Promise<DalError | Record<string, never>> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, datetime: true, isDraft: true },
  });
  if (!event || event.isDraft) return { error: "Event not found." };

  let attendeeId: string;

  try {
    const created = await prisma.eventAttendee.create({
      data: { eventId, userId },
      select: { id: true },
    });
    attendeeId = created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Already attending — just update responses
      const existing = await prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { id: true },
      });
      if (!existing) return {};
      attendeeId = existing.id;
    } else {
      throw err;
    }
  }

  try {
    await saveResponses(attendeeId, responses);
  } catch (err) {
    console.error("Failed to save responses for attend:", err);
  }

  try {
    await scheduleEventReminderNotification(userId, event);
  } catch (err) {
    console.error("Failed to schedule event reminder:", err);
  }

  return {};
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dal/attendance.ts
git commit -m "feat: extend attendance DAL to save responses on register/attend"
```

---

## Task 14: Extend Attendance Server Actions

**Files:**
- Modify: `lib/actions/events-attendance.ts`

- [ ] **Step 1: Import new DAL function and types**

Update imports at the top:

```typescript
import { attendEvent, unattendEvent, registerEvent, attendWithResponses } from "@/lib/dal/attendance";
import type { ResponseInput } from "@/lib/validations/questions";
```

- [ ] **Step 2: Add helper to extract responses from FormData**

Add this helper function before the exported actions:

```typescript
function extractResponses(formData: FormData): ResponseInput[] {
  const responses: ResponseInput[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("response_file_") && typeof value === "string" && value) {
      const questionId = key.replace("response_file_", "");
      const existing = responses.find((r) => r.questionId === questionId);
      if (existing) {
        existing.fileUrl = value;
      } else {
        responses.push({ questionId, fileUrl: value, answer: null });
      }
    } else if (key.startsWith("response_") && !key.startsWith("response_file_") && typeof value === "string") {
      const questionId = key.replace("response_", "");
      const existing = responses.find((r) => r.questionId === questionId);
      if (existing) {
        existing.answer = value || null;
      } else {
        responses.push({ questionId, answer: value || null, fileUrl: null });
      }
    }
  }
  return responses;
}
```

- [ ] **Step 3: Extend registerEventAction to parse and pass responses**

Replace the existing `registerEventAction` with:

```typescript
export async function registerEventAction(
  eventId: string,
  _prevState: RegisterEventState,
  formData: FormData
): Promise<RegisterEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const rawSelectedDays = formData.get("selectedDays");
  let selectedDays: string[] | undefined;
  if (typeof rawSelectedDays === "string" && rawSelectedDays) {
    try {
      const parsed = JSON.parse(rawSelectedDays);
      if (Array.isArray(parsed)) selectedDays = parsed.filter((d): d is string => typeof d === "string");
    } catch {
      // ignore malformed JSON
    }
  }

  const parsed = registerEventSchema.safeParse({
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
    selectedDays,
  });

  if (!parsed.success) return { error: "Invalid form data." };

  const responses = extractResponses(formData);

  const result = await registerEvent(eventId, session.user.id, {
    phone: parsed.data.phone,
    notes: parsed.data.notes,
    selectedDays: parsed.data.selectedDays,
    responses,
  });

  if ("error" in result) return { error: result.error };

  invalidateEventCaches(eventId);
  return { success: true };
}
```

- [ ] **Step 4: Add attendWithQuestionsAction**

Add after `registerEventAction`:

```typescript
export async function attendWithQuestionsAction(
  eventId: string,
  _prevState: AttendEventState,
  formData: FormData
): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const responses = extractResponses(formData);

  const result = await attendWithResponses(eventId, session.user.id, responses);
  if ("error" in result && result.error) return { error: result.error };

  invalidateEventCaches(eventId);
  return {};
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/events-attendance.ts
git commit -m "feat: extend registration actions to save custom question responses"
```

---

## Task 15: Questions Form Component (Attendee)

**Files:**
- Create: `app/(app)/events/[id]/_components/questions-form.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/[id]/_components/questions-form.tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { QuestionType } from "@/lib/validations/questions";

interface Question {
  id: string;
  type: string;
  label: string;
  options: string[];
  required: boolean;
}

interface QuestionsFormProps {
  questions: Question[];
  defaultResponses?: Record<string, { answer: string | null; fileUrl: string | null }>;
  disabled?: boolean;
}

export function QuestionsForm({ questions, defaultResponses = {}, disabled }: QuestionsFormProps) {
  // Controlled state for YES_NO switches so hidden inputs stay in sync with FormData
  const [switchValues, setSwitchValues] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const q of questions) {
      if (q.type === QuestionType.YES_NO) {
        initial[q.id] = defaultResponses[q.id]?.answer === "true";
      }
    }
    return initial;
  });

  const [fileUrls, setFileUrls] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of questions) {
      const existing = defaultResponses[q.id]?.fileUrl;
      if (existing) initial[q.id] = existing;
    }
    return initial;
  });
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(questionId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setFileErrors((prev) => ({ ...prev, [questionId]: "File must be 10MB or less." }));
      return;
    }
    setFileErrors((prev) => ({ ...prev, [questionId]: "" }));
    setUploading((prev) => ({ ...prev, [questionId]: true }));
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: "response",
      });
      setFileUrls((prev) => ({ ...prev, [questionId]: blob.url }));
      setFileNames((prev) => ({ ...prev, [questionId]: file.name }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [questionId]: "Upload failed. Please try again." }));
    } finally {
      setUploading((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => {
        const defaultAnswer = defaultResponses[q.id]?.answer ?? undefined;

        return (
          <div key={q.id} className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {q.label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {q.type === QuestionType.SHORT_TEXT && (
              <Input
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? ""}
                required={q.required}
                disabled={disabled}
                placeholder="Your answer..."
              />
            )}

            {q.type === QuestionType.LONG_TEXT && (
              <Textarea
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? ""}
                required={q.required}
                disabled={disabled}
                rows={3}
                placeholder="Your answer..."
              />
            )}

            {q.type === QuestionType.YES_NO && (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 min-h-[56px]">
                <span className="text-sm text-muted-foreground">
                  {switchValues[q.id] ? "Yes" : "No"}
                </span>
                <Switch
                  checked={switchValues[q.id] ?? false}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    setSwitchValues((prev) => ({ ...prev, [q.id]: checked }))
                  }
                />
                {/* Hidden input carries the switch value through FormData */}
                <input
                  type="hidden"
                  name={`response_${q.id}`}
                  value={switchValues[q.id] ? "true" : "false"}
                />
              </div>
            )}

            {q.type === QuestionType.MULTIPLE_CHOICE && (
              <RadioGroup
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? undefined}
                disabled={disabled}
                className="flex flex-col gap-2"
              >
                {q.options.map((opt) => (
                  <div key={opt} className="flex items-center gap-2.5 min-h-[44px]">
                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                    <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === QuestionType.FILE_UPLOAD && (
              <div className="flex flex-col gap-1.5">
                <input
                  ref={(el) => { inputRefs.current[q.id] = el; }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(q.id, file);
                    e.target.value = "";
                  }}
                />
                {fileUrls[q.id] ? (
                  <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3">
                    <Paperclip className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{fileNames[q.id] ?? "Uploaded file"}</span>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => {
                          setFileUrls((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                          setFileNames((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                    <input type="hidden" name={`response_file_${q.id}`} value={fileUrls[q.id]} />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading[q.id] || disabled}
                    onClick={() => inputRefs.current[q.id]?.click()}
                  >
                    <Paperclip className="size-4 mr-2" />
                    {uploading[q.id] ? "Uploading..." : "Attach file"}
                  </Button>
                )}
                {fileErrors[q.id] && (
                  <p className="text-xs text-destructive">{fileErrors[q.id]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/events/[id]/_components/questions-form.tsx"
git commit -m "feat: add QuestionsForm component for rendering custom questions to attendees"
```

---

## Task 16: Update Registration Drawer

**Files:**
- Modify: `app/(app)/events/[id]/_components/registration-drawer.tsx`

- [ ] **Step 1: Add questions and existingResponses props**

Update the `RegistrationDrawerProps` interface:

```typescript
interface Question {
  id: string;
  type: string;
  label: string;
  options: string[];
  required: boolean;
}

interface RegistrationDrawerProps {
  eventId: string;
  eventTitle: string;
  isRegistered: boolean;
  userName: string;
  userEmail: string;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
  questions?: Question[];
  existingResponses?: Record<string, { answer: string | null; fileUrl: string | null }>;
  mode?: "register" | "attend";  // "attend" = quick attend with questions
}
```

- [ ] **Step 2: Import QuestionsForm and new action**

Add imports:

```typescript
import { QuestionsForm } from "./questions-form";
import { attendWithQuestionsAction } from "@/lib/actions/events-attendance";
```

- [ ] **Step 3: Wire up the correct action based on mode**

In the component body, before the return, determine the action:

```typescript
  const mode = props.mode ?? "register";
  const boundAction = mode === "attend"
    ? attendWithQuestionsAction.bind(null, eventId)
    : registerEventAction.bind(null, eventId);

  const [state, formAction, isPending] = useActionState<RegisterEventState, FormData>(
    boundAction,
    {}
  );
```

Update the destructuring to accept the new props and rename `props` usage accordingly.

- [ ] **Step 4: Add QuestionsForm inside the form, after existing fields**

In the form JSX, after the `collectNotes` block and before the submit button, add:

```tsx
              {questions && questions.length > 0 && (
                <QuestionsForm
                  questions={questions}
                  defaultResponses={existingResponses}
                  disabled={isPending}
                />
              )}
```

- [ ] **Step 5: Update "already registered" state to allow editing**

When `isRegistered` is true and there are questions, show the form pre-filled instead of the confirmation screen, so the user can update responses.

Replace the entire content inside `<div className="px-4 pb-2 flex flex-col gap-4">` with:

```tsx
          {isRegistered && (!questions || questions.length === 0) ? (
            // No questions — show standard confirmation screen
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You&apos;re {mode === "register" ? "registered" : "going"} for this event.
              </p>
            </div>
          ) : (
            // Show form (for first-time submit OR when editing existing responses)
            <form action={formAction} className="flex flex-col gap-4">
              {state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Static name/email — only for registration mode */}
              {mode === "register" && (
                <>
                  <div className="grid gap-1.5">
                    <Label>Name</Label>
                    <Input value={userName} disabled className="bg-muted" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Email</Label>
                    <Input value={userEmail} disabled className="bg-muted" />
                  </div>
                </>
              )}

              {/* Camp partial days — only for camps with registration */}
              {showPartialDays && allDays.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Which days will you attend?</Label>
                  <div className="flex flex-col gap-2 rounded-xl border px-3 py-3">
                    {allDays.map((day) => (
                      <div key={day} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`day-${day}`}
                          checked={selectedDays.includes(day)}
                          onCheckedChange={() => toggleDay(day)}
                          disabled={isPending}
                        />
                        <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer">
                          {formatDayLabel(day)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <input type="hidden" name="selectedDays" value={JSON.stringify(selectedDays)} />
                </div>
              )}

              {/* Phone — only when event collects phone */}
              {collectPhone && (
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+44 7700 000000" disabled={isPending} />
                </div>
              )}

              {/* Notes — only when event collects notes */}
              {collectNotes && (
                <div className="grid gap-1.5">
                  <Label htmlFor="notes">Dietary / accessibility needs</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Let us know if you have any requirements..."
                    disabled={isPending}
                  />
                </div>
              )}

              {/* Custom questions */}
              {questions && questions.length > 0 && (
                <QuestionsForm
                  questions={questions}
                  defaultResponses={existingResponses}
                  disabled={isPending}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || (showPartialDays ? selectedDays.length === 0 : false)}
              >
                {isPending
                  ? isRegistered ? "Updating..." : mode === "attend" ? "Confirming..." : "Registering..."
                  : isRegistered ? "Update response"
                  : mode === "attend" ? "Confirm attendance"
                  : "Confirm Registration"}
              </Button>

              {showPartialDays && selectedDays.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Please select at least one day to attend.
                </p>
              )}
            </form>
          )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/events/[id]/_components/registration-drawer.tsx"
git commit -m "feat: integrate custom questions form into registration drawer"
```

---

## Task 17: Update Event Action Bar

**Files:**
- Modify: `app/(app)/events/[id]/_components/event-action-bar.tsx`

- [ ] **Step 1: Add questions and existingResponses props**

Update `EventActionBarProps`:

```typescript
interface Question {
  id: string;
  type: string;
  label: string;
  options: string[];
  required: boolean;
}

interface EventActionBarProps {
  // ... all existing props ...
  questions?: Question[];
  existingResponses?: Record<string, { answer: string | null; fileUrl: string | null }>;
}
```

- [ ] **Step 2: Handle quick attend with questions**

In the JSX, update the "not requiresRegistration" branch. Currently it renders `<AttendButton>`. Change it to open the drawer when there are questions:

```tsx
            {!isCancelled && !isDraft && (requiresRegistration || (questions && questions.length > 0) ? (
              <Button
                onClick={() => setDrawerOpen(true)}
                variant={isAttending ? "outline" : "default"}
                className={isAttending ? "gap-1.5" : ""}
                disabled={isFull}
              >
                {isAttending && <Check className="size-4" />}
                {isAttending
                  ? requiresRegistration ? "Registered" : "Going"
                  : isFull ? "Fully booked"
                  : requiresRegistration ? "Register" : "I'm going"}
              </Button>
            ) : (
              <AttendButton eventId={eventId} isAttending={isAttending} />
            ))}
```

- [ ] **Step 3: Always render RegistrationDrawer when it may be needed**

Update the conditional that renders `<RegistrationDrawer>`:

```tsx
      {(requiresRegistration || (questions && questions.length > 0)) && (
        <RegistrationDrawer
          eventId={eventId}
          eventTitle={eventTitle}
          isRegistered={isAttending}
          userName={userName}
          userEmail={userEmail}
          collectPhone={collectPhone}
          collectNotes={collectNotes}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          camp={camp}
          campStartDate={campStartDate}
          questions={questions}
          existingResponses={existingResponses}
          mode={requiresRegistration ? "register" : "attend"}
        />
      )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/events/[id]/_components/event-action-bar.tsx"
git commit -m "feat: update EventActionBar to trigger question drawer for all events with questions"
```

---

## Task 18: Update Event Detail Page

**Files:**
- Modify: `app/(app)/events/[id]/page.tsx`

- [ ] **Step 1: Fetch questions and existing responses**

Add imports:

```typescript
import { getEventQuestions } from "@/lib/actions/data-questions";
import { getMyResponsesForEvent } from "@/lib/dal/responses";
import { TableProperties } from "lucide-react";
```

In the page component, add to the data fetching:

```typescript
  const questions = await getEventQuestions(id);

  const myResponses = session?.user?.id && questions.length > 0 && isAttending
    ? await getMyResponsesForEvent(id, session.user.id)
    : {};
```

- [ ] **Step 2: Pass questions and responses to EventActionBar**

Add `questions` and `existingResponses` to the `<EventActionBar>` component call:

```tsx
      <EventActionBar
        {/* ... all existing props ... */}
        questions={questions}
        existingResponses={myResponses}
      />
```

- [ ] **Step 3: Add "View responses" button for organisers**

In the info card section, after the edit/cancel/delete buttons, add:

```tsx
            {canManage && questions.length > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/events/${id}/responses`}>
                  <TableProperties className="size-4 mr-1.5" />
                  View responses
                </Link>
              </Button>
            )}
```

Place this after the action buttons but inside the `canManage` block.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/events/[id]/page.tsx"
git commit -m "feat: fetch questions and pass to event detail page; add View Responses link"
```

---

## Task 19: Update Attendees Drawer with Response Badge

**Files:**
- Modify: `app/(app)/events/[id]/_components/attendees-drawer.tsx`

- [ ] **Step 1: Add hasQuestions prop and response badge**

Update the `AttendeesDrawerProps` interface to accept question count:

```typescript
interface AttendeesDrawerProps {
  attendees: Awaited<ReturnType<typeof getEventAttendees>>;
  requiresRegistration: boolean;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
  questionCount?: number;
}
```

Update the `getEventAttendees` query in `lib/actions/data-events.ts` to include response count per attendee:

```typescript
export async function getEventAttendees(eventId: string) {
  cacheTag("events", `event-${eventId}`);
  cacheLife("minutes");
  return prisma.eventAttendee.findMany({
    where: { eventId },
    select: {
      id: true,
      phone: true,
      notes: true,
      metadata: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
```

In the attendee card, add the badge after the name/email:

```tsx
                  {questionCount != null && questionCount > 0 && (
                    <Badge
                      variant="secondary"
                      className={
                        a._count.responses >= questionCount
                          ? "text-xs bg-green-100 text-green-700 border-green-200"
                          : "text-xs bg-yellow-100 text-yellow-700 border-yellow-200"
                      }
                    >
                      {a._count.responses >= questionCount ? "Answered" : "Partial"}
                    </Badge>
                  )}
```

Add `Badge` to the imports:

```typescript
import { Badge } from "@/components/ui/badge";
```

Pass `questionCount` from `EventActionBar`:

In `EventActionBar`, pass `questionCount` to `AttendeesDrawer`:

```tsx
        <AttendeesDrawer
          {/* ... existing props ... */}
          questionCount={questions?.length ?? 0}
        />
```

And update the `EventActionBar` `AttendeesDrawerProps` spread accordingly.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/events/[id]/_components/attendees-drawer.tsx" lib/actions/data-events.ts "app/(app)/events/[id]/_components/event-action-bar.tsx"
git commit -m "feat: add Answered/Partial badge to attendees drawer"
```

---

## Task 20: Responses Page — CSV Export Button

**Files:**
- Create: `app/(app)/events/[id]/responses/_components/csv-export-button.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/[id]/responses/_components/csv-export-button.tsx
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column { label: string; type: string }
interface AttendeeRow {
  name: string;
  email: string;
  responses: Record<string, { answer: string | null; fileUrl: string | null }>;
}

interface CsvExportButtonProps {
  columns: Column[];
  rows: AttendeeRow[];
  filename?: string;
}

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function CsvExportButton({ columns, rows, filename = "responses.csv" }: CsvExportButtonProps) {
  function handleExport() {
    const headers = ["Name", "Email", ...columns.map((c) => c.label)];
    const csvRows = rows.map((row) => {
      const cells = [
        row.name,
        row.email,
        ...columns.map((col) => {
          const r = row.responses[col.label];
          if (!r) return "—";
          if (r.fileUrl) return r.fileUrl;
          return r.answer ?? "—";
        }),
      ];
      return cells.map(escapeCell).join(",");
    });

    const csv = [headers.map(escapeCell).join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="size-4 mr-1.5" />
      Export CSV
    </Button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 21: Responses Page — Table Component

**Files:**
- Create: `app/(app)/events/[id]/responses/_components/responses-table.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(app)/events/[id]/responses/_components/responses-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CsvExportButton } from "./csv-export-button";
import { QuestionType } from "@/lib/validations/questions";

interface Question { id: string; label: string; type: string }
interface Attendee {
  id: string;
  user: { id: string; name: string | null; email: string };
  responses: { questionId: string; answer: string | null; fileUrl: string | null }[];
}

interface ResponsesTableProps {
  questions: Question[];
  attendees: Attendee[];
  eventTitle: string;
}

export function ResponsesTable({ questions, attendees, eventTitle }: ResponsesTableProps) {
  const responseMap = attendees.map((a) => ({
    name: a.user.name ?? a.user.email,
    email: a.user.email,
    responses: Object.fromEntries(
      a.responses.map((r) => {
        const q = questions.find((q) => q.id === r.questionId);
        return [q?.label ?? r.questionId, { answer: r.answer, fileUrl: r.fileUrl }];
      })
    ),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CsvExportButton
          columns={questions.map((q) => ({ label: q.label, type: q.type }))}
          rows={responseMap}
          filename={`${eventTitle.toLowerCase().replace(/\s+/g, "-")}-responses.csv`}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] sticky left-0 bg-background">Attendee</TableHead>
              {questions.map((q) => (
                <TableHead key={q.id} className="min-w-[180px]">
                  {q.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={questions.length + 1} className="text-center text-muted-foreground py-8">
                  No responses yet.
                </TableCell>
              </TableRow>
            ) : (
              attendees.map((attendee) => {
                const byQuestionId = Object.fromEntries(
                  attendee.responses.map((r) => [r.questionId, r])
                );

                return (
                  <TableRow key={attendee.id}>
                    <TableCell className="sticky left-0 bg-background">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{attendee.user.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{attendee.user.email}</span>
                      </div>
                    </TableCell>
                    {questions.map((q) => {
                      const r = byQuestionId[q.id];
                      if (!r) return <TableCell key={q.id} className="text-muted-foreground">—</TableCell>;

                      return (
                        <TableCell key={q.id}>
                          {q.type === QuestionType.YES_NO && (
                            <Badge variant={r.answer === "true" ? "default" : "secondary"}>
                              {r.answer === "true" ? "Yes" : "No"}
                            </Badge>
                          )}
                          {q.type === QuestionType.FILE_UPLOAD && r.fileUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                                View file
                              </a>
                            </Button>
                          )}
                          {(q.type === QuestionType.SHORT_TEXT ||
                            q.type === QuestionType.LONG_TEXT ||
                            q.type === QuestionType.MULTIPLE_CHOICE) && (
                            <span
                              className="text-sm line-clamp-2"
                              title={r.answer ?? ""}
                            >
                              {r.answer ?? "—"}
                            </span>
                          )}
                          {!r.answer && !r.fileUrl && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

## Task 22: Responses Page

**Files:**
- Create: `app/(app)/events/[id]/responses/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(app)/events/[id]/responses/page.tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEventById } from "@/lib/actions/data-events";
import { getEventResponses } from "@/lib/actions/data-questions";
import { canManageChurch } from "@/lib/permissions";
import { ResponsesTable } from "./_components/responses-table";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? `Responses — ${event.title}` : "Responses" };
}

export default async function EventResponsesPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  const event = await getEventById(id);
  if (!event) notFound();

  const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);
  if (!canManage) redirect(`/events/${id}`);

  const { questions, attendees } = await getEventResponses(id);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">Responses</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-card p-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">
            This event has no custom questions.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-card p-4">
          <ResponsesTable
            questions={questions}
            attendees={attendees}
            eventTitle={event.title}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit all responses page files**

```bash
git add "app/(app)/events/[id]/responses/"
git commit -m "feat: add organiser responses page with table and CSV export"
```

---

## Task 23: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build completes without errors. Note any warnings but don't block on them.

- [ ] **Step 3: Manual smoke test — create event with questions**

Start the dev server:

```bash
npm run dev
```

1. Log in as an ORGANISER
2. Navigate to `/events/create`
3. Complete Basics, When & Where, Registration steps
4. On the **Questions** step: tap "Add question", fill in a short-text question labelled "What's your dietary preference?", mark it required, tap "Add question"
5. Add a second question: YES_NO type labelled "Will you need transport?", not required
6. Add a third question: MULTIPLE_CHOICE type labelled "Which session will you attend?", options "Morning", "Afternoon", "Evening"
7. Tap Next → Review → Publish
8. Verify the event publishes successfully

- [ ] **Step 4: Manual smoke test — attend with questions**

1. Log in as an ATTENDEE
2. Navigate to the published event
3. Tap "I'm going" — verify the questions drawer opens
4. Answer all questions, tap "Confirm attendance"
5. Verify attendance is recorded
6. Tap "I'm going" again — verify form pre-fills with existing answers
7. Change an answer and re-submit — verify update works

- [ ] **Step 5: Manual smoke test — responses page**

1. Log in as ORGANISER
2. Navigate to the event
3. Tap "View responses"
4. Verify the responses table shows attendee rows and question columns
5. Tap "Export CSV" — verify CSV downloads with correct data

- [ ] **Step 6: Verify library reuse**

1. Log in as ORGANISER
2. Create a second event
3. On the Questions step, tap "Add question" → "Pick from library"
4. Verify the questions from the first event appear in the library
5. Select one — verify the form pre-fills

- [ ] **Step 7: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: manual testing fixes for custom questions feature"
```

---

## Implementation Complete

All tasks produce working, committed changes. The feature is ready for a PR when `npm run build` passes and manual smoke tests pass.
