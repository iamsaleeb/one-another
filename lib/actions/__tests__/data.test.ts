jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findMany: jest.fn(), findUnique: jest.fn() },
    church: { findMany: jest.fn(), findUnique: jest.fn() },
    series: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    churchOrganiser: { findMany: jest.fn() },
    churchAdmin: { findMany: jest.fn() },
    churchFollower: { findMany: jest.fn(), findUnique: jest.fn() },
    seriesFollower: { findUnique: jest.fn() },
    eventAttendee: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

import {
  getEvents,
  getEventById,
  getMyEventAttendance,
  getEventsByCreator,
  getEventsNotByCreator,
  getEventAttendees,
  getUserAttendedEvents,
  getUserAttendedPastEvents,
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
  getFollowedChurchEventsPaged,
  getOtherChurchEventsPaged,
} from "@/lib/actions/data-events";
import {
  getChurches,
  getChurchById,
  getMyChurchFollow,
  getChurchesByIds,
  getOrganisersByChurch,
} from "@/lib/actions/data-churches";
import {
  getSeries,
  getSeriesById,
  getMySeriesFollow,
  getSeriesByCreator,
  getSeriesNotByCreator,
  getUserFollowedSeries,
  getSeriesForEvent,
} from "@/lib/actions/data-series";
import {
  searchEventsAndChurches,
  getProfileUser,
} from "@/lib/actions/data-user";
import { prisma } from "@/lib/db";

const mockEventFindMany = prisma.event.findMany as jest.Mock;
const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockChurchFindMany = prisma.church.findMany as jest.Mock;
const mockChurchFindUnique = prisma.church.findUnique as jest.Mock;
const mockSeriesFindMany = prisma.series.findMany as jest.Mock;
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockChurchOrganiserFindMany = prisma.churchOrganiser
  .findMany as jest.Mock;
const _mockChurchAdminFindMany = prisma.churchAdmin.findMany as jest.Mock;
const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock;
const mockEventAttendeeFindUnique = prisma.eventAttendee
  .findUnique as jest.Mock;
const mockChurchFollowerFindMany = prisma.churchFollower.findMany as jest.Mock;
const mockChurchFollowerFindUnique = prisma.churchFollower
  .findUnique as jest.Mock;
const mockSeriesFollowerFindUnique = prisma.seriesFollower
  .findUnique as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;

const sampleEvent = {
  id: "evt-1",
  title: "Sunday Service",
  datetime: "2026-03-16T09:00:00Z",
  location: "Main Hall",
  host: "Pastor John",
  tag: "Youth Meeting",
  createdAt: new Date(),
};

const sampleChurch = {
  id: "ch-1",
  name: "Grace Church",
  address: "123 Church St",
  serviceTimes: [],
  events: [],
};

const sampleSeries = {
  id: "ser-1",
  name: "Bible Study Series",
  description: "Weekly Bible study",
  cadence: "WEEKLY",
  location: "Room 101",
  host: "Pastor John",
  tag: "Bible Study",
  churchId: "ch-1",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getEvents", () => {
  it("returns upcoming events ordered by createdAt asc", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);
    const result = await getEvents();
    expect(result).toEqual([sampleEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { datetime: { gte: expect.any(Date) }, isDraft: false },
      orderBy: { datetime: "asc" },
      take: 50,
      include: { church: { select: { name: true } } },
    });
  });

  it("returns an empty array when there are no upcoming events", async () => {
    mockEventFindMany.mockResolvedValue([]);
    expect(await getEvents()).toEqual([]);
  });
});

describe("getEventById", () => {
  it("returns the matching event without per-user attendance data", async () => {
    mockEventFindUnique.mockResolvedValue(sampleEvent);
    const result = await getEventById("evt-1");
    expect(result).toEqual(sampleEvent);
    expect(mockEventFindUnique).toHaveBeenCalledWith({
      where: { id: "evt-1" },
      include: {
        church: { select: { id: true, name: true } },
        series: { select: { id: true, name: true } },
        _count: { select: { attendees: true } },
      },
    });
  });

  it("does not include attendees in the query", async () => {
    mockEventFindUnique.mockResolvedValue(sampleEvent);
    await getEventById("evt-1");
    expect(mockEventFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ attendees: expect.anything() }),
      })
    );
  });

  it("returns null when the event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    expect(await getEventById("not-found")).toBeNull();
  });
});

describe("getMyEventAttendance", () => {
  it("queries eventAttendee with compound key", async () => {
    const attendanceRecord = { userId: "user-1", metadata: null };
    mockEventAttendeeFindUnique.mockResolvedValue(attendanceRecord);

    const result = await getMyEventAttendance("evt-1", "user-1");

    expect(result).toEqual(attendanceRecord);
    expect(mockEventAttendeeFindUnique).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "evt-1", userId: "user-1" } },
      select: { userId: true, metadata: true },
    });
  });

  it("returns null when user is not attending", async () => {
    mockEventAttendeeFindUnique.mockResolvedValue(null);
    expect(await getMyEventAttendance("evt-1", "user-99")).toBeNull();
  });
});

describe("getOrganisersByChurch", () => {
  it("returns organisers for a church ordered by name", async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([
      { user: { id: "user-1", name: "Alice", email: "alice@example.com" } },
    ]);

    const result = await getOrganisersByChurch("ch-1");

    expect(result).toEqual([
      { id: "user-1", name: "Alice", email: "alice@example.com" },
    ]);
    expect(mockChurchOrganiserFindMany).toHaveBeenCalledWith({
      where: { churchId: "ch-1" },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });
  });

  it("returns an empty array when the church has no organisers", async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([]);
    expect(await getOrganisersByChurch("ch-none")).toEqual([]);
  });
});

describe("getChurchesByIds", () => {
  it("returns churches matching the given IDs ordered by name", async () => {
    mockChurchFindMany.mockResolvedValue([
      { id: "ch-1", name: "Grace Church" },
      { id: "ch-2", name: "Harvest Church" },
    ]);

    const result = await getChurchesByIds(["ch-1", "ch-2"]);

    expect(result).toEqual([
      { id: "ch-1", name: "Grace Church" },
      { id: "ch-2", name: "Harvest Church" },
    ]);
    expect(mockChurchFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["ch-1", "ch-2"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });

  it("returns empty array without hitting the DB when ids is empty", async () => {
    const result = await getChurchesByIds([]);
    expect(result).toEqual([]);
    expect(mockChurchFindMany).not.toHaveBeenCalled();
  });
});

describe("getChurches", () => {
  it("returns churches ordered by name with only id and name selected", async () => {
    const minimalChurch = { id: "ch-1", name: "Grace Church" };
    mockChurchFindMany.mockResolvedValue([minimalChurch]);
    const result = await getChurches();
    expect(result).toEqual([minimalChurch]);
    expect(mockChurchFindMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });
});

describe("getChurchById", () => {
  it("returns the matching church without per-user follow data", async () => {
    mockChurchFindUnique.mockResolvedValue(sampleChurch);
    const result = await getChurchById("ch-1");
    expect(result).toEqual(sampleChurch);
    expect(mockChurchFindUnique).toHaveBeenCalledWith({
      where: { id: "ch-1" },
      include: {
        serviceTimes: true,
        events: {
          where: { datetime: { gte: expect.any(Date) }, isDraft: false },
          orderBy: { datetime: "asc" },
          take: 20,
        },
        series: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                events: {
                  where: {
                    datetime: { gte: expect.any(Date) },
                    isDraft: false,
                  },
                },
              },
            },
          },
        },
        _count: { select: { followers: true } },
      },
    });
  });

  it("does not include followers in the query", async () => {
    mockChurchFindUnique.mockResolvedValue(sampleChurch);
    await getChurchById("ch-1");
    expect(mockChurchFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ followers: expect.anything() }),
      })
    );
  });

  it("returns null when the church does not exist", async () => {
    mockChurchFindUnique.mockResolvedValue(null);
    expect(await getChurchById("missing")).toBeNull();
  });
});

describe("getMyChurchFollow", () => {
  it("queries churchFollower with compound key", async () => {
    const followRecord = { userId: "user-1" };
    mockChurchFollowerFindUnique.mockResolvedValue(followRecord);

    const result = await getMyChurchFollow("ch-1", "user-1");

    expect(result).toEqual(followRecord);
    expect(mockChurchFollowerFindUnique).toHaveBeenCalledWith({
      where: { churchId_userId: { churchId: "ch-1", userId: "user-1" } },
      select: { userId: true },
    });
  });

  it("returns null when user is not following", async () => {
    mockChurchFollowerFindUnique.mockResolvedValue(null);
    expect(await getMyChurchFollow("ch-1", "user-99")).toBeNull();
  });
});

describe("searchEventsAndChurches", () => {
  it("runs parallel queries for events and churches", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);
    mockChurchFindMany.mockResolvedValue([sampleChurch]);

    const result = await searchEventsAndChurches({ query: "grace" });

    expect(result).toEqual({ events: [sampleEvent], churches: [sampleChurch] });
  });

  it("searches events across title, location, host, and tag fields", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockChurchFindMany.mockResolvedValue([]);

    await searchEventsAndChurches({ query: "worship" });

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          datetime: expect.objectContaining({ gte: expect.any(Date) }),
          OR: [
            { title: { contains: "worship", mode: "insensitive" } },
            { location: { contains: "worship", mode: "insensitive" } },
            { host: { contains: "worship", mode: "insensitive" } },
            { tag: { contains: "worship", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("searches churches across name and address fields", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockChurchFindMany.mockResolvedValue([]);

    await searchEventsAndChurches({ query: "baptist" });

    expect(mockChurchFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "baptist", mode: "insensitive" } },
          { address: { contains: "baptist", mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, address: true },
    });
  });

  it("returns empty arrays when nothing matches", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockChurchFindMany.mockResolvedValue([]);

    expect(await searchEventsAndChurches({ query: "zzznomatch" })).toEqual({
      events: [],
      churches: [],
    });
  });

  it("returns empty arrays when no filters provided", async () => {
    expect(await searchEventsAndChurches({ query: "" })).toEqual({
      events: [],
      churches: [],
    });
  });

  it("filters events by type=events only", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    const result = await searchEventsAndChurches({
      query: "grace",
      type: "events",
    });

    expect(result.churches).toEqual([]);
    expect(mockChurchFindMany).not.toHaveBeenCalled();
  });

  it("filters to churches only when type=churches", async () => {
    mockChurchFindMany.mockResolvedValue([sampleChurch]);

    const result = await searchEventsAndChurches({
      query: "grace",
      type: "churches",
    });

    expect(result.events).toEqual([]);
  });
});

describe("getSeries", () => {
  it("returns all series ordered by createdAt desc with event count", async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 3 } };
    mockSeriesFindMany.mockResolvedValue([seriesWithCount]);

    const result = await getSeries();

    expect(result).toEqual([seriesWithCount]);
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            events: {
              where: { datetime: { gte: expect.any(Date) }, isDraft: false },
            },
          },
        },
      },
    });
  });

  it("returns empty array when no series exist", async () => {
    mockSeriesFindMany.mockResolvedValue([]);
    expect(await getSeries()).toEqual([]);
  });
});

describe("getSeriesById", () => {
  it("returns the matching series without per-user follow data", async () => {
    const fullSeries = {
      ...sampleSeries,
      church: { id: "ch-1", name: "Grace Church" },
      events: [sampleEvent],
    };
    mockSeriesFindUnique.mockResolvedValue(fullSeries);

    const result = await getSeriesById("ser-1");

    expect(result).toEqual(fullSeries);
    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      include: {
        church: { select: { id: true, name: true } },
        events: {
          where: { datetime: { gte: expect.any(Date) }, isDraft: false },
          orderBy: { datetime: "asc" },
        },
        _count: { select: { followers: true } },
      },
    });
  });

  it("does not include followers in the query", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    await getSeriesById("ser-1");
    expect(mockSeriesFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ followers: expect.anything() }),
      })
    );
  });

  it("returns null when series does not exist", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    expect(await getSeriesById("not-found")).toBeNull();
  });
});

describe("getMySeriesFollow", () => {
  it("queries seriesFollower with compound key", async () => {
    const followRecord = { userId: "user-1" };
    mockSeriesFollowerFindUnique.mockResolvedValue(followRecord);

    const result = await getMySeriesFollow("ser-1", "user-1");

    expect(result).toEqual(followRecord);
    expect(mockSeriesFollowerFindUnique).toHaveBeenCalledWith({
      where: { seriesId_userId: { seriesId: "ser-1", userId: "user-1" } },
      select: { userId: true },
    });
  });

  it("returns null when user is not following", async () => {
    mockSeriesFollowerFindUnique.mockResolvedValue(null);
    expect(await getMySeriesFollow("ser-1", "user-99")).toBeNull();
  });
});

describe("getEventsByCreator", () => {
  it("returns all events created by the given user including drafts", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);
    const result = await getEventsByCreator("user-1");
    expect(result).toEqual([sampleEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { createdById: "user-1" },
      orderBy: { datetime: "asc" },
      take: 50,
      include: {
        church: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  it("returns empty array when the user has no events", async () => {
    mockEventFindMany.mockResolvedValue([]);
    expect(await getEventsByCreator("user-none")).toEqual([]);
  });
});

describe("getSeriesByCreator", () => {
  it("returns series created by the given user", async () => {
    const seriesWithCount = {
      ...sampleSeries,
      _count: { events: 2 },
      createdBy: { name: "Alice" },
    };
    mockSeriesFindMany.mockResolvedValue([seriesWithCount]);
    const result = await getSeriesByCreator("user-1");
    expect(result).toEqual([seriesWithCount]);
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: { createdById: "user-1" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            events: {
              where: { datetime: { gte: expect.any(Date) }, isDraft: false },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });
  });

  it("returns empty array when the user has no series", async () => {
    mockSeriesFindMany.mockResolvedValue([]);
    expect(await getSeriesByCreator("user-none")).toEqual([]);
  });
});

describe("getEventsNotByCreator", () => {
  it("returns upcoming events not created by the given user", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);
    const result = await getEventsNotByCreator("user-1");
    expect(result).toEqual([sampleEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: {
        datetime: { gte: expect.any(Date) },
        isDraft: false,
        OR: [{ createdById: { not: "user-1" } }, { createdById: null }],
      },
      orderBy: { datetime: "asc" },
      take: 50,
      include: {
        church: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  it("returns empty array when no other events exist", async () => {
    mockEventFindMany.mockResolvedValue([]);
    expect(await getEventsNotByCreator("user-1")).toEqual([]);
  });
});

describe("getSeriesNotByCreator", () => {
  it("returns series not created by the given user", async () => {
    const seriesWithCount = {
      ...sampleSeries,
      _count: { events: 1 },
      createdBy: { name: "Bob" },
    };
    mockSeriesFindMany.mockResolvedValue([seriesWithCount]);
    const result = await getSeriesNotByCreator("user-1");
    expect(result).toEqual([seriesWithCount]);
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: {
        OR: [{ createdById: { not: "user-1" } }, { createdById: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: {
            events: {
              where: { datetime: { gte: expect.any(Date) }, isDraft: false },
            },
          },
        },
        createdBy: { select: { name: true } },
      },
    });
  });

  it("returns empty array when no other series exist", async () => {
    mockSeriesFindMany.mockResolvedValue([]);
    expect(await getSeriesNotByCreator("user-1")).toEqual([]);
  });
});

describe("getEventAttendees", () => {
  const sampleAttendees = [
    {
      id: "ea-1",
      phone: "+61400000000",
      notes: "Vegetarian",
      metadata: null,
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    },
    {
      id: "ea-2",
      phone: null,
      notes: null,
      metadata: null,
      user: { id: "user-2", name: "Bob", email: "bob@example.com" },
    },
  ];

  it("returns attendees for the given event ordered by createdAt asc", async () => {
    mockEventAttendeeFindMany.mockResolvedValue(sampleAttendees);

    const result = await getEventAttendees("evt-1");

    expect(result).toEqual(sampleAttendees);
    expect(mockEventAttendeeFindMany).toHaveBeenCalledWith({
      where: { eventId: "evt-1" },
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
  });

  it("returns an empty array when no one has registered", async () => {
    mockEventAttendeeFindMany.mockResolvedValue([]);

    const result = await getEventAttendees("evt-empty");

    expect(result).toEqual([]);
    expect(mockEventAttendeeFindMany).toHaveBeenCalledWith({
      where: { eventId: "evt-empty" },
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
  });
});

describe("getUserAttendedEvents", () => {
  it("returns upcoming events attended by the given user ordered by datetime asc", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);
    const result = await getUserAttendedEvents("user-1");
    expect(result).toEqual([sampleEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: {
        datetime: { gte: expect.any(Date) },
        isDraft: false,
        attendees: { some: { userId: "user-1" } },
      },
      orderBy: { datetime: "asc" },
      take: 50,
      include: { church: { select: { name: true } } },
    });
  });

  it("returns empty array when the user has no upcoming attended events", async () => {
    mockEventFindMany.mockResolvedValue([]);
    expect(await getUserAttendedEvents("user-none")).toEqual([]);
  });
});

describe("getUserAttendedPastEvents", () => {
  it("returns past events attended by the given user ordered by datetime desc", async () => {
    const pastEvent = {
      ...sampleEvent,
      id: "evt-past",
      datetime: "2020-01-01T10:00:00Z",
    };
    mockEventFindMany.mockResolvedValue([pastEvent]);
    const result = await getUserAttendedPastEvents("user-1");
    expect(result).toEqual([pastEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: {
        datetime: { lt: expect.any(Date) },
        isDraft: false,
        attendees: { some: { userId: "user-1" } },
      },
      orderBy: { datetime: "desc" },
      take: 50,
      include: { church: { select: { name: true } } },
    });
  });

  it("returns empty array when the user has no past attended events", async () => {
    mockEventFindMany.mockResolvedValue([]);
    expect(await getUserAttendedPastEvents("user-none")).toEqual([]);
  });
});

describe("getUserFollowedSeries", () => {
  it("returns series followed by the given user with upcoming event count", async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 4 } };
    mockSeriesFindMany.mockResolvedValue([seriesWithCount]);
    const result = await getUserFollowedSeries("user-1");
    expect(result).toEqual([seriesWithCount]);
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: { followers: { some: { userId: "user-1" } } },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            events: {
              where: { datetime: { gte: expect.any(Date) }, isDraft: false },
            },
          },
        },
      },
    });
  });

  it("returns empty array when the user follows no series", async () => {
    mockSeriesFindMany.mockResolvedValue([]);
    expect(await getUserFollowedSeries("user-none")).toEqual([]);
  });
});

describe("getProfileUser", () => {
  it("returns phone and dateOfBirth for the given user", async () => {
    const profileData = {
      phone: "+61400000000",
      dateOfBirth: new Date("1990-01-01"),
    };
    mockUserFindUnique.mockResolvedValue(profileData);

    const result = await getProfileUser("user-1");

    expect(result).toEqual(profileData);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { phone: true, dateOfBirth: true },
    });
  });

  it("returns null when the user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    expect(await getProfileUser("user-missing")).toBeNull();
  });
});

describe("getSeriesForEvent", () => {
  it("returns slim series data for event creation", async () => {
    const seriesData = {
      id: "ser-1",
      name: "Bible Study Series",
      church: { id: "ch-1", name: "Grace Church" },
    };
    mockSeriesFindUnique.mockResolvedValue(seriesData);

    const result = await getSeriesForEvent("ser-1");

    expect(result).toEqual(seriesData);
    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      select: {
        id: true,
        name: true,
        church: { select: { id: true, name: true } },
      },
    });
  });

  it("returns null when the series does not exist", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    expect(await getSeriesForEvent("ser-missing")).toBeNull();
  });
});

const pagedEvent = {
  id: "evt-1",
  title: "Sunday Service",
  datetime: new Date("2026-06-01T09:00:00Z"),
  location: "Main Hall",
  host: "Pastor John",
  tag: "Youth Meeting",
  cancelledAt: null,
  isDraft: false,
  photoUrl: null,
  church: { name: "Grace Church" },
};

describe("getEventsPaged", () => {
  it("returns items and null nextCursor when fewer than PAGE_SIZE+1 results", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getEventsPaged(null);
    expect(result.items).toEqual([pagedEvent]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns PAGE_SIZE items and nextCursor when more than PAGE_SIZE results exist", async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => ({
      ...pagedEvent,
      id: `evt-${i}`,
    }));
    mockEventFindMany.mockResolvedValue(eleven);
    const result = await getEventsPaged(null);
    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe("evt-9");
  });

  it("passes cursor and skip to prisma when cursor is provided", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsPaged("evt-5");
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "evt-5" }, skip: 1 })
    );
  });

  it("does not pass cursor when cursor is null", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsPaged(null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ cursor: expect.anything() })
    );
  });
});

describe("getUserAttendedEventsPaged", () => {
  it("returns items filtered by userId", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getUserAttendedEventsPaged("user-1", null);
    expect(result.items).toEqual([pagedEvent]);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          attendees: { some: { userId: "user-1" } },
        }),
      })
    );
  });

  it("returns null nextCursor when at last page", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    const result = await getUserAttendedEventsPaged("user-1", null);
    expect(result.nextCursor).toBeNull();
  });
});

describe("getUserAttendedPastEventsPaged", () => {
  it("filters by datetime lt and orders desc", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getUserAttendedPastEventsPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ datetime: { lt: expect.any(Date) } }),
        orderBy: { datetime: "desc" },
      })
    );
  });
});

describe("getEventsByCreatorPaged", () => {
  it("filters by createdById", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsByCreatorPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdById: "user-1" },
      })
    );
  });
});

describe("getEventsNotByCreatorPaged", () => {
  it("excludes events by the given userId", async () => {
    mockEventFindMany.mockResolvedValue([pagedEvent]);
    await getEventsNotByCreatorPaged("user-1", null);
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ createdById: { not: "user-1" } }, { createdById: null }],
        }),
      })
    );
  });
});

describe("getFollowedChurchEventsPaged", () => {
  it("returns events from followed churches, first page", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([
      { churchId: "ch-1" },
      { churchId: "ch-2" },
    ]);
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    const result = await getFollowedChurchEventsPaged("user-1", null);

    expect(mockChurchFollowerFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { churchId: true },
    });
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: { in: ["ch-1", "ch-2"] },
          isDraft: false,
          datetime: { gte: expect.any(Date) },
        }),
        orderBy: { datetime: "asc" },
        take: 11,
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when more pages exist", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([{ churchId: "ch-1" }]);
    const events = Array.from({ length: 11 }, (_, i) => ({
      ...sampleEvent,
      id: `evt-${i}`,
    }));
    mockEventFindMany.mockResolvedValue(events);

    const result = await getFollowedChurchEventsPaged("user-1", null);

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe("evt-9");
  });

  it("passes cursor when provided", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([{ churchId: "ch-1" }]);
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    await getFollowedChurchEventsPaged("user-1", "cursor-id");

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "cursor-id" },
        skip: 1,
      })
    );
  });

  it("returns empty page when user follows no churches", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([]);
    mockEventFindMany.mockResolvedValue([]);

    const result = await getFollowedChurchEventsPaged("user-1", null);

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

describe("getOtherChurchEventsPaged", () => {
  it("excludes followed church events for authenticated user", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([{ churchId: "ch-1" }]);
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    const result = await getOtherChurchEventsPaged("user-1", null);

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: { notIn: ["ch-1"] },
          isDraft: false,
          datetime: { gte: expect.any(Date) },
        }),
      })
    );
    expect(result.items).toHaveLength(1);
  });

  it("returns all events when userId is null (unauthenticated)", async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    const result = await getOtherChurchEventsPaged(null, null);

    expect(mockChurchFollowerFindMany).not.toHaveBeenCalled();
    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: { notIn: [] },
        }),
      })
    );
    expect(result.items).toHaveLength(1);
  });

  it("returns nextCursor when more pages exist", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([]);
    const events = Array.from({ length: 11 }, (_, i) => ({
      ...sampleEvent,
      id: `evt-${i}`,
    }));
    mockEventFindMany.mockResolvedValue(events);

    const result = await getOtherChurchEventsPaged("user-1", null);

    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe("evt-9");
  });

  it("passes cursor when provided", async () => {
    mockChurchFollowerFindMany.mockResolvedValue([]);
    mockEventFindMany.mockResolvedValue([sampleEvent]);

    await getOtherChurchEventsPaged("user-1", "cursor-id");

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "cursor-id" },
        skip: 1,
      })
    );
  });
});
