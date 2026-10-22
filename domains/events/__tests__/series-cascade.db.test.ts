// What a Series change means for its Events, driven through the Series module
// as the app drives it.
jest.mock("next/cache", () => ({ updateTag: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { eventSubject } from "@/domains/roles/lib/ability";
import { deleteSeries, updateSeries } from "@/domains/series/dal/series";
import {
  as,
  follow,
  makeChurch,
  makeEvent,
  makeSeries,
  makeUser,
  pending,
} from "@/test/db/factories";

const staleTags = () => (updateTag as jest.Mock).mock.calls.map((c) => c[0]);

const seriesInput = (churchId: string) => ({
  name: "Youth Night",
  description: "Weekly",
  cadence: "WEEKLY" as const,
  location: "Hall",
  host: "Sam",
  tag: "Youth",
  churchId,
});

// Admin of both Churches, so moves between them are allowed.
const admin = () =>
  as("admin", {
    church: [
      { churchId: "c1", role: "CHURCH_ADMIN" },
      { churchId: "c2", role: "CHURCH_ADMIN" },
    ],
  });

beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all(["admin", "u1"].map((id) => makeUser(id)));
  await makeChurch("c1");
  await makeChurch("c2");
  await makeSeries("s1", "c1");
  await makeEvent({ id: "e1", churchId: "c1", seriesId: "s1" });
  await makeEvent({ id: "e2", churchId: "c1", seriesId: "s1" });
  await follow("s1", "u1");
  await prisma.notification.create({
    data: {
      userId: "u1",
      type: "NEW_SERIES_SESSION",
      title: "New Session Added",
      body: "",
      scheduledFor: new Date(),
      dedupeKey: "s1:e1",
    },
  });
});

describe("deleting a Series", () => {
  it("keeps its Events as standalone Events in the Church", async () => {
    expect(await deleteSeries("s1", admin())).toEqual({ churchId: "c1" });

    expect(await prisma.event.findMany({ orderBy: { id: "asc" } })).toEqual([
      expect.objectContaining({ id: "e1", churchId: "c1", seriesId: null }),
      expect.objectContaining({ id: "e2", churchId: "c1", seriesId: null }),
    ]);
  });

  it("withdraws its sessions' pending new-session notices", async () => {
    await deleteSeries("s1", admin());

    expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
  });

  it("makes its Events' pages stale", async () => {
    await deleteSeries("s1", admin());

    expect(staleTags()).toEqual(
      expect.arrayContaining(["event-e1", "event-e2"])
    );
  });

  it("changes nothing when refused", async () => {
    expect(await deleteSeries("s1", as("u1"))).toEqual({
      error: "Unauthorised.",
    });
    expect(await prisma.series.count()).toBe(1);
    expect(await pending("NEW_SERIES_SESSION")).toHaveLength(1);
  });
});

describe("moving a Series to another Church", () => {
  it("moves its Events with it, so the Role cascade follows", async () => {
    expect(await updateSeries("s1", seriesInput("c2"), admin())).toEqual({
      oldChurchId: "c1",
      newChurchId: "c2",
    });

    const events = await prisma.event.findMany();
    expect(events.map((e) => e.churchId)).toEqual(["c2", "c2"]);

    // The new Church's admins now reach them; the old Church's do not.
    const newAdmin = as("x", {
      church: [{ churchId: "c2", role: "CHURCH_ADMIN" }],
    });
    const oldAdmin = as("y", {
      church: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });
    expect(newAdmin.ability.can("update", eventSubject(events[0]))).toBe(true);
    expect(oldAdmin.ability.can("update", eventSubject(events[0]))).toBe(false);
  });

  it("makes both Churches' pages and its Events' pages stale", async () => {
    await updateSeries("s1", seriesInput("c2"), admin());

    expect(staleTags()).toEqual(
      expect.arrayContaining(["event-e1", "event-e2", "church-c1", "church-c2"])
    );
  });

  it("leaves its Events alone when the Church does not change", async () => {
    await updateSeries("s1", seriesInput("c1"), admin());

    expect(staleTags()).not.toContain("event-e1");
  });

  it("moves nothing when refused", async () => {
    const onlyC1 = as("admin", {
      church: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });
    expect(await updateSeries("s1", seriesInput("c2"), onlyC1)).toEqual({
      error: "Unauthorised.",
    });
    expect((await prisma.event.findMany()).map((e) => e.churchId)).toEqual([
      "c1",
      "c1",
    ]);
  });
});
