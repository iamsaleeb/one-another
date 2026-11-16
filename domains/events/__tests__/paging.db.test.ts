jest.mock("next/cache", () => ({ cacheTag: jest.fn(), cacheLife: jest.fn() }));

import { prisma } from "@/lib/db";
import { makeChurch, makeEvent, makeUser } from "@/test/db/factories";
import {
  getMySavedEventsPaged,
  getOtherChurchEventsPaged,
} from "../actions/data";

// Weekly Series sessions and bulk saves share a timestamp, so paging must
// order ties by id or a page can skip or repeat rows.
const START = new Date("2030-06-01T10:00:00.000Z");
const END = new Date("2030-06-01T12:00:00.000Z");
const SAVED_AT = new Date("2030-01-01T00:00:00.000Z");
const COUNT = 25; // three pages of 10

const ids = Array.from(
  { length: COUNT },
  (_, i) => `e${String(i).padStart(2, "0")}`
);

async function collect(
  load: (
    cursor: string | null
  ) => Promise<{ items: Array<{ id: string }>; nextCursor: string | null }>
) {
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await load(cursor);
    seen.push(...page.items.map((e) => e.id));
    cursor = page.nextCursor;
  } while (cursor);
  return seen;
}

beforeEach(async () => {
  await makeUser("u1");
  await makeChurch("c1");
  // Insert in reverse so insertion order differs from id order.
  for (const id of [...ids].reverse()) {
    await makeEvent({
      id,
      churchId: "c1",
      datetime: START,
      endDatetime: END,
      isDraft: false,
    });
  }
});

it("pages through Events that start at the same time without gaps or repeats", async () => {
  const seen = await collect((cursor) =>
    getOtherChurchEventsPaged(null, cursor)
  );

  expect(seen).toEqual(ids);
});

it("pages through Events saved at the same time without gaps or repeats", async () => {
  await prisma.savedEvent.createMany({
    data: ids.map((eventId) => ({
      id: `s-${eventId}`,
      userId: "u1",
      eventId,
      createdAt: SAVED_AT,
    })),
  });

  const seen = await collect((cursor) => getMySavedEventsPaged("u1", cursor));

  expect(seen).toEqual([...ids].reverse());
});
