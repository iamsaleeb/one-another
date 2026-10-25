// The Series lifecycle against a real database: each change, what it does to
// the Series' Events, and which pages it makes stale.
jest.mock("next/cache", () => ({ updateTag: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSeries,
  deleteSeries,
  followSeries,
  saveSeries,
  unfollowSeries,
} from "../lifecycle";
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

describe("creating a Series", () => {
  it("records who created it and refreshes the lists", async () => {
    const result = await createSeries(
      { ...seriesInput("c1"), photoUrl: "https://x/p.jpg" },
      admin()
    );
    if (!("id" in result)) throw new Error("expected a Series");

    expect(
      await prisma.series.findUnique({ where: { id: result.id } })
    ).toEqual(
      expect.objectContaining({
        churchId: "c1",
        createdById: "admin",
        photoUrl: "https://x/p.jpg",
      })
    );
    expect(staleTags()).toEqual(
      expect.arrayContaining(["series", "churches", "church-c1", "events-list"])
    );
  });

  it("is refused in a Church the user may not create Series in", async () => {
    const creator = as("u1", {
      church: [{ churchId: "c1", role: "EVENT_CREATOR" }],
    });
    expect(await createSeries(seriesInput("c1"), creator)).toEqual({
      error: "Unauthorised.",
    });
    expect(await prisma.series.count()).toBe(1);
  });
});

describe("saving a Series", () => {
  it("updates its fields and its own pages", async () => {
    expect(
      await saveSeries("s1", { ...seriesInput("c1"), name: "Renamed" }, admin())
    ).toEqual({});

    expect(await prisma.series.findUnique({ where: { id: "s1" } })).toEqual(
      expect.objectContaining({ name: "Renamed", photoUrl: null })
    );
    expect(staleTags()).toEqual(
      expect.arrayContaining(["series", "series-s1", "church-c1"])
    );
  });

  it("lets a Series manager edit their own Series", async () => {
    const manager = as("u1", {
      series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
    });
    expect(
      await saveSeries("s1", { ...seriesInput("c1"), name: "Mine" }, manager)
    ).toEqual({});
  });

  it("tells a missing Series apart from a forbidden one", async () => {
    expect(await saveSeries("nope", seriesInput("c1"), admin())).toEqual({
      error: "Series not found.",
    });
    expect(await saveSeries("s1", seriesInput("c1"), as("u1"))).toEqual({
      error: "Unauthorised.",
    });
  });
});

describe("a Series' Church", () => {
  it("stays the same, whatever Church was sent, and its Events stay too", async () => {
    // The form sends no Church; a stray one from any other caller is ignored.
    expect(await saveSeries("s1", seriesInput("c2"), admin())).toEqual({});

    expect(await prisma.series.findUnique({ where: { id: "s1" } })).toEqual(
      expect.objectContaining({ churchId: "c1", name: "Youth Night" })
    );
    expect((await prisma.event.findMany()).map((e) => e.churchId)).toEqual([
      "c1",
      "c1",
    ]);
    expect(staleTags()).not.toContain("church-c2");
  });
});

describe("deleting a Series", () => {
  it("keeps its Events as standalone Events in the Church", async () => {
    expect(await deleteSeries("s1", admin())).toEqual({});

    expect(await prisma.event.findMany({ orderBy: { id: "asc" } })).toEqual([
      expect.objectContaining({ id: "e1", churchId: "c1", seriesId: null }),
      expect.objectContaining({ id: "e2", churchId: "c1", seriesId: null }),
    ]);
  });

  it("withdraws its sessions' pending new-session notices", async () => {
    await deleteSeries("s1", admin());

    expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
  });

  it("makes the lists and its Events' pages stale", async () => {
    await deleteSeries("s1", admin());

    expect(staleTags()).toEqual(
      expect.arrayContaining(["event-e1", "event-e2", "churches", "church-c1"])
    );
  });

  it("is refused to a Series manager", async () => {
    const manager = as("u1", {
      series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
    });
    expect(await deleteSeries("s1", manager)).toEqual({
      error: "Unauthorised.",
    });
  });

  it("changes nothing when refused", async () => {
    expect(await deleteSeries("s1", as("u1"))).toEqual({
      error: "Unauthorised.",
    });
    expect(await prisma.series.count()).toBe(1);
    expect(await pending("NEW_SERIES_SESSION")).toHaveLength(1);
  });
});

describe("following a Series", () => {
  const followers = () =>
    prisma.seriesFollower.findMany({ where: { seriesId: "s1" } });

  it("adds the follower once, however often they follow", async () => {
    expect(await followSeries("s1", as("admin"))).toEqual({});
    expect(await followSeries("s1", as("admin"))).toEqual({});

    expect((await followers()).map((f) => f.userId).sort()).toEqual([
      "admin",
      "u1",
    ]);
    expect(staleTags()).toEqual(
      expect.arrayContaining(["series-s1", "user-series-admin"])
    );
  });

  it("removes the follower, and unfollowing again changes nothing", async () => {
    expect(await unfollowSeries("s1", as("u1"))).toEqual({});
    expect(await unfollowSeries("s1", as("u1"))).toEqual({});

    expect(await followers()).toEqual([]);
  });

  it("needs a signed-in user", async () => {
    expect(await followSeries("s1", as(null))).toEqual({
      error: "You must be signed in.",
    });
    expect(await unfollowSeries("s1", as(null))).toEqual({
      error: "You must be signed in.",
    });
  });

  it("reports a Series that does not exist", async () => {
    expect(await followSeries("nope", as("u1"))).toEqual({
      error: "Series not found.",
    });
  });
});
