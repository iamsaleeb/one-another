# Seed Custom Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `prisma/seed.ts` so that the camp event and orientation event have realistic `EventQuestion` rows, and each organiser has a pre-populated `QuestionLibraryItem` library to pick from.

**Architecture:** All changes are in `prisma/seed.ts`. Two registration events (camp + orientation) get `EventQuestion` rows seeded inline after their events are created, using captured return values. Each organiser also gets `QuestionLibraryItem` rows seeded after their `User` records are created. EventQuestion rows reference matching library items via `libraryItemId`.

**Tech Stack:** Prisma, TypeScript, PostgreSQL

---

### Task 1: Capture event IDs for camp and orientation events

The camp and orientation `event.create` calls currently discard their return values. Capture them so Tasks 2 and 3 can reference their IDs.

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Capture camp event return value**

In `seed.ts`, find the camp event creation (search for `"St. Mary Summer Camp 2026"`). Change:

```ts
await prisma.event.create({
  data: {
    datetime: future(campDay, "08:00"),
    title: "St. Mary Summer Camp 2026 — \"Called by Name\"",
    // ...
  },
});
```

to:

```ts
const campEvent = await prisma.event.create({
  data: {
    datetime: future(campDay, "08:00"),
    title: "St. Mary Summer Camp 2026 — \"Called by Name\"",
    // ...
  },
});
```

- [ ] **Step 2: Capture orientation event return value**

Find the orientation event creation (search for `"New Servants Orientation Evening"`). Change:

```ts
await prisma.event.create({
  data: {
    datetime: future(18, "17:00"),
    title: "New Servants Orientation Evening",
    // ...
  },
});
```

to:

```ts
const orientationEvent = await prisma.event.create({
  data: {
    datetime: future(18, "17:00"),
    title: "New Servants Orientation Evening",
    // ...
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "refactor(seed): capture camp and orientation event return values"
```

---

### Task 2: Seed QuestionLibraryItem rows for each organiser

Add a library of reusable questions per organiser after their `User` records are created (after the `churchOrganiser` and `churchAdmin` creates, before `console.warn`).

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add library items block**

After the `await prisma.churchAdmin.create(...)` line (around line 651) and before `console.warn("Seed completed successfully.")`, insert:

```ts
// ── Question Library Items ───────────────────────────────────────────────────

// organiser1 (Fr. Bishoy) — camp / retreat questions
const lib1 = await prisma.$transaction([
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "MULTIPLE_CHOICE",
      label: "T-shirt size",
      options: ["XS", "S", "M", "L", "XL", "XXL"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "MULTIPLE_CHOICE",
      label: "Age group",
      options: ["13–15", "16–18", "19–22"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "YES_NO",
      label: "Can you swim?",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "SHORT_TEXT",
      label: "Emergency contact name and phone number",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "MULTIPLE_CHOICE",
      label: "Dietary restrictions",
      options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser1.id,
      type: "LONG_TEXT",
      label: "Medical conditions or allergies we should know about",
      options: [],
    },
  }),
]);

// organiser2 (Deacon Mina) — general reusables
await prisma.$transaction([
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser2.id,
      type: "YES_NO",
      label: "Have you read the required material?",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser2.id,
      type: "SHORT_TEXT",
      label: "What is your deacon name (if ordained)?",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser2.id,
      type: "MULTIPLE_CHOICE",
      label: "Dietary restrictions",
      options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser2.id,
      type: "LONG_TEXT",
      label: "Any questions you would like addressed?",
      options: [],
    },
  }),
]);

// organiser3 (Fr. Antonious) — servants / formation questions
const lib3 = await prisma.$transaction([
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser3.id,
      type: "MULTIPLE_CHOICE",
      label: "Which ministry are you interested in serving?",
      options: ["Youth", "Sunday School", "Choir", "Deaconate", "Outreach", "Other"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser3.id,
      type: "MULTIPLE_CHOICE",
      label: "How long have you been a member of St. George?",
      options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser3.id,
      type: "YES_NO",
      label: "Do you currently serve in any ministry?",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser3.id,
      type: "LONG_TEXT",
      label: "What do you hope to get out of this orientation?",
      options: [],
    },
  }),
  prisma.questionLibraryItem.create({
    data: {
      createdById: organiser3.id,
      type: "SHORT_TEXT",
      label: "Emergency contact name and phone number",
      options: [],
    },
  }),
]);
```

Note: `lib1` and `lib3` are captured (arrays) because Task 3 uses their IDs via index. `lib1[0]` = T-shirt size, `lib1[1]` = Age group, etc. `lib3[0]` = ministry interest, `lib3[1]` = membership length, etc.

- [ ] **Step 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): add QuestionLibraryItem rows for all organisers"
```

---

### Task 3: Seed EventQuestion rows for camp and orientation

After the library items block from Task 2, add EventQuestion rows for both events, referencing their library items.

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add EventQuestion rows for camp**

After the lib3 / lib1 block (still before `console.warn`), append:

```ts
// ── Event Questions ──────────────────────────────────────────────────────────

await prisma.eventQuestion.createMany({
  data: [
    {
      eventId: campEvent.id,
      type: "MULTIPLE_CHOICE",
      label: "T-shirt size",
      options: ["XS", "S", "M", "L", "XL", "XXL"],
      required: true,
      order: 0,
      libraryItemId: lib1[0].id,
    },
    {
      eventId: campEvent.id,
      type: "MULTIPLE_CHOICE",
      label: "Age group",
      options: ["13–15", "16–18", "19–22"],
      required: true,
      order: 1,
      libraryItemId: lib1[1].id,
    },
    {
      eventId: campEvent.id,
      type: "YES_NO",
      label: "Can you swim?",
      options: [],
      required: true,
      order: 2,
      libraryItemId: lib1[2].id,
    },
    {
      eventId: campEvent.id,
      type: "SHORT_TEXT",
      label: "Emergency contact name and phone number",
      options: [],
      required: true,
      order: 3,
      libraryItemId: lib1[3].id,
    },
    {
      eventId: campEvent.id,
      type: "MULTIPLE_CHOICE",
      label: "Dietary restrictions",
      options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
      required: false,
      order: 4,
      libraryItemId: lib1[4].id,
    },
    {
      eventId: campEvent.id,
      type: "LONG_TEXT",
      label: "Medical conditions or allergies we should know about",
      options: [],
      required: false,
      order: 5,
      libraryItemId: lib1[5].id,
    },
  ],
});
```

- [ ] **Step 2: Add EventQuestion rows for orientation**

Immediately after:

```ts
await prisma.eventQuestion.createMany({
  data: [
    {
      eventId: orientationEvent.id,
      type: "MULTIPLE_CHOICE",
      label: "Which ministry are you interested in serving?",
      options: ["Youth", "Sunday School", "Choir", "Deaconate", "Outreach", "Other"],
      required: true,
      order: 0,
      libraryItemId: lib3[0].id,
    },
    {
      eventId: orientationEvent.id,
      type: "MULTIPLE_CHOICE",
      label: "How long have you been a member of St. George?",
      options: ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"],
      required: false,
      order: 1,
      libraryItemId: lib3[1].id,
    },
    {
      eventId: orientationEvent.id,
      type: "YES_NO",
      label: "Do you currently serve in any ministry?",
      options: [],
      required: false,
      order: 2,
      libraryItemId: lib3[2].id,
    },
    {
      eventId: orientationEvent.id,
      type: "LONG_TEXT",
      label: "What do you hope to get out of this orientation?",
      options: [],
      required: false,
      order: 3,
      libraryItemId: lib3[3].id,
    },
  ],
});
```

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(seed): add EventQuestion rows for camp and orientation events"
```

---

### Task 4: Verify seed runs cleanly

- [ ] **Step 1: Run the seed**

```bash
npx tsx prisma/seed.ts
```

Expected output:
```
Seed completed successfully.
```

No error means all FK references resolved correctly (library item IDs existed before event questions referenced them).

- [ ] **Step 2: Spot-check in Prisma Studio (optional)**

```bash
npx prisma studio
```

Navigate to `EventQuestion` — confirm 6 rows for the camp event and 4 rows for the orientation event, each with a non-null `libraryItemId`.

Navigate to `QuestionLibraryItem` — confirm 6 rows for organiser1, 4 for organiser2, 5 for organiser3.
