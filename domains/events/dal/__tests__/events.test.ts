import { NotificationType } from "@prisma/client";

jest.mock("@/lib/db", () => {
  const { fakeTable } = jest.requireActual("@/domains/roles/testing");
  return {
    prisma: {
      event: fakeTable([]),
      series: { findUnique: jest.fn() },
      eventStaffAssignment: { create: jest.fn() },
      eventAttendee: { findMany: jest.fn() },
      seriesFollower: { findMany: jest.fn() },
    },
  };
});

jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

jest.mock("@/domains/notifications/queue", () => ({
  scheduleEventReminderNotifications: jest.fn().mockResolvedValue(undefined),
  rescheduleEventReminderNotifications: jest.fn().mockResolvedValue(undefined),
  cancelManyNotifications: jest.fn().mockResolvedValue(undefined),
  queueNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/domains/events/questions/dal", () => ({
  syncEventQuestions: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/db";
import { buildAbility } from "@/domains/roles/lib/ability";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
import { systemAbility } from "@/domains/roles/lib/system-ability";
import { grants, type fakeTable } from "@/domains/roles/testing";
import type { Grants } from "@/domains/roles/lib/grants";
import type { CreateEventInput } from "../../validations/event";
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  publishEvent,
  updateEvent,
} from "../events";

type FakeTable = ReturnType<
  typeof fakeTable<{
    id: string;
    churchId: string;
    seriesId: string | null;
    title: string;
    isDraft: boolean;
    datetime: Date | null;
  }>
>;

const events = prisma.event as unknown as FakeTable;
const mockSeriesFind = prisma.series.findUnique as jest.Mock;
const mockStaffCreate = prisma.eventStaffAssignment.create as jest.Mock;
const mockAttendees = prisma.eventAttendee.findMany as jest.Mock;
const mockFollowers = prisma.seriesFollower.findMany as jest.Mock;
const mockQueue = jest.requireMock("@/domains/notifications/queue") as {
  queueNotification: jest.Mock;
  cancelManyNotifications: jest.Mock;
};

function signIn(userGrants: Grants, userId = "u1") {
  (getSessionUserId as jest.Mock).mockResolvedValue(userId);
  (getAbility as jest.Mock).mockResolvedValue(buildAbility(userGrants));
}

// c1 ── s1 ── evt-1 (draft)     c1 ── evt-2     c2 ── s3 ── evt-3
const SERIES = {
  s1: { churchId: "c1" },
  s2: { churchId: "c1" },
  s3: { churchId: "c2" },
} as Record<string, { churchId: string }>;

beforeEach(() => {
  jest.clearAllMocks();
  events.rows.splice(
    0,
    events.rows.length,
    {
      id: "evt-1",
      churchId: "c1",
      seriesId: "s1",
      title: "Sunday Service",
      isDraft: true,
      datetime: new Date(Date.now() + 86400000),
    },
    {
      id: "evt-2",
      churchId: "c1",
      seriesId: null,
      title: "Friday Night",
      isDraft: false,
      datetime: null,
    },
    {
      id: "evt-3",
      churchId: "c2",
      seriesId: "s3",
      title: "Other church",
      isDraft: false,
      datetime: null,
    }
  );
  mockSeriesFind.mockImplementation(
    async ({ where }: { where: { id: string } }) => SERIES[where.id] ?? null
  );
  mockAttendees.mockResolvedValue([]);
  mockFollowers.mockResolvedValue([]);
});

const input = (over: Partial<CreateEventInput> = {}) =>
  ({
    title: "Event",
    churchId: "c1",
    tag: "Social",
    description: "d",
    ...over,
  }) as CreateEventInput;

describe("notification deduplication", () => {
  it("publish queues NEW_SERIES_SESSION keyed by series and event", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] }));
    mockFollowers.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ]);

    await publishEvent("evt-1");

    for (const userId of ["user-1", "user-2"])
      expect(mockQueue.queueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.NEW_SERIES_SESSION,
          dedupeKey: "s1:evt-1",
          userId,
        })
      );
  });

  it("cancel queues EVENT_CANCELLED keyed by event", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] }));
    mockAttendees.mockResolvedValue([{ userId: "user-3" }]);

    await cancelEvent("evt-2", "Venue unavailable");

    expect(mockQueue.queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.EVENT_CANCELLED,
        dedupeKey: "cancelled:evt-2",
        userId: "user-3",
      })
    );
  });
});

describe("createEvent", () => {
  it("guest is refused", async () => {
    (getSessionUserId as jest.Mock).mockResolvedValue(null);
    (getAbility as jest.Mock).mockResolvedValue(buildAbility(null));
    expect(await createEvent(input())).toEqual({ error: "Unauthorised." });
  });

  it("Series-only staff may create a session in their Series", async () => {
    signIn(
      grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
    );
    (prisma.event as unknown as { create: jest.Mock }).create = jest
      .fn()
      .mockResolvedValue({ id: "new-1" });

    const result = await createEvent(
      input({ seriesId: "s1", churchId: undefined })
    );

    expect(result).toMatchObject({
      id: "new-1",
      churchId: "c1",
      seriesId: "s1",
    });
    // No Church/Series Grant lets them edit it, so they get a Creator Grant.
    expect(mockStaffCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        eventId: "new-1",
        role: "EVENT_EDITOR",
      }),
    });
  });

  it("Series-only staff may not create outside their Series", async () => {
    signIn(
      grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
    );
    expect(
      await createEvent(input({ seriesId: "s2", churchId: undefined }))
    ).toEqual({
      error: "Unauthorised.",
    });
    expect(await createEvent(input())).toEqual({ error: "Unauthorised." });
  });

  it("Series manager still gets a Creator Grant, so it survives leaving the Series", async () => {
    signIn(grants({ series: [{ seriesId: "s1", role: "SERIES_MANAGER" }] }));
    (prisma.event as unknown as { create: jest.Mock }).create = jest
      .fn()
      .mockResolvedValue({ id: "new-3" });

    await createEvent(input({ seriesId: "s1", churchId: undefined }));

    expect(mockStaffCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: "new-3", role: "EVENT_EDITOR" }),
    });
  });

  it("systemAbility creates with the named user, or none", async () => {
    (getAbility as jest.Mock).mockRejectedValue(new Error("no session"));
    const create = jest.fn().mockResolvedValue({ id: "new-4" });
    (prisma.event as unknown as { create: jest.Mock }).create = create;

    expect(
      await createEvent(input(), { ability: systemAbility() })
    ).toMatchObject({ id: "new-4" });
    expect(create.mock.calls[0][0].data.createdById).toBeNull();
    expect(mockStaffCreate).not.toHaveBeenCalled();

    await createEvent(input(), { ability: systemAbility(), userId: "seed" });
    expect(create.mock.calls[1][0].data.createdById).toBe("seed");
  });

  it("Church EVENT_MANAGER gets no redundant Creator Grant", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] }));
    (prisma.event as unknown as { create: jest.Mock }).create = jest
      .fn()
      .mockResolvedValue({ id: "new-2" });

    await createEvent(input());

    expect(mockStaffCreate).not.toHaveBeenCalled();
  });
});

describe("updateEvent", () => {
  it("Church EVENT_CREATOR cannot edit an Event they have no Grant on", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_CREATOR" }] }));
    expect(await updateEvent("evt-2", input())).toEqual({
      error: "Unauthorised.",
    });
    expect(events.update).not.toHaveBeenCalled();
  });

  it("reports a missing Event as not found", async () => {
    signIn(grants({ isPlatformAdmin: true }));
    expect(await updateEvent("nope", input())).toEqual({
      error: "Event not found.",
    });
  });

  it("Series manager may not move a session into a Series they do not manage", async () => {
    signIn(grants({ series: [{ seriesId: "s1", role: "SERIES_MANAGER" }] }));
    expect(
      await updateEvent("evt-1", input({ seriesId: "s2", churchId: undefined }))
    ).toEqual({ error: "Unauthorised." });
    expect(events.rows.find((e) => e.id === "evt-1")?.seriesId).toBe("s1");
  });

  it("Event editor may not move the Event to another Church", async () => {
    signIn(grants({ event: [{ eventId: "evt-2", role: "EVENT_EDITOR" }] }));
    expect(await updateEvent("evt-2", input({ churchId: "c2" }))).toEqual({
      error: "Unauthorised.",
    });
  });

  it("Church manager may move an Event between Series in their Church", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] }));
    const result = await updateEvent(
      "evt-1",
      input({ seriesId: "s2", churchId: undefined })
    );
    expect(result).toEqual({
      oldChurchId: "c1",
      newChurchId: "c1",
      affectedSeriesIds: ["s1", "s2"],
    });
    expect(events.rows.find((e) => e.id === "evt-1")?.seriesId).toBe("s2");
    // The old Series' pending "new session" notification is cancelled.
    expect(mockQueue.cancelManyNotifications).toHaveBeenCalledWith({
      type: NotificationType.NEW_SERIES_SESSION,
      dedupeKey: "s1:evt-1",
    });
  });

  it("may not move an Event somewhere they could not then edit it", async () => {
    signIn(
      grants({
        church: [
          { churchId: "c1", role: "EVENT_MANAGER" },
          { churchId: "c2", role: "EVENT_CREATOR" },
        ],
      })
    );
    expect(await updateEvent("evt-2", input({ churchId: "c2" }))).toEqual({
      error: "Unauthorised.",
    });
    expect(events.rows.find((e) => e.id === "evt-2")?.churchId).toBe("c1");
  });

  it("creator at the destination who keeps an Event Grant may move it", async () => {
    signIn(
      grants({
        church: [{ churchId: "c2", role: "EVENT_CREATOR" }],
        event: [{ eventId: "evt-2", role: "EVENT_EDITOR" }],
      })
    );
    expect(await updateEvent("evt-2", input({ churchId: "c2" }))).toEqual({
      oldChurchId: "c1",
      newChurchId: "c2",
      affectedSeriesIds: [],
    });
  });

  it("systemAbility syncs questions without a library owner", async () => {
    (getAbility as jest.Mock).mockRejectedValue(new Error("no session"));
    const { syncEventQuestions } = jest.requireMock(
      "@/domains/events/questions/dal"
    ) as { syncEventQuestions: jest.Mock };

    await updateEvent("evt-2", input({ questions: [] }), {
      ability: systemAbility(),
    });

    expect(syncEventQuestions).toHaveBeenCalledWith("evt-2", [], null);
  });

  it("Event editor may edit their Event in place", async () => {
    signIn(grants({ event: [{ eventId: "evt-2", role: "EVENT_EDITOR" }] }));
    const result = await updateEvent("evt-2", input({ title: "Renamed" }));
    expect(result).not.toHaveProperty("error");
    expect(events.rows.find((e) => e.id === "evt-2")?.title).toBe("Renamed");
  });
});

describe("scoped writes", () => {
  it("no Grant on another Church's Event: nothing is written", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] }));
    expect(await deleteEvent("evt-3")).toEqual({ error: "Unauthorised." });
    expect(await publishEvent("evt-3")).toEqual({ error: "Unauthorised." });
    expect(events.rows).toHaveLength(3);
  });

  it("delete removes the Event for an authorised user", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] }));
    expect(await deleteEvent("evt-2")).toEqual({
      churchId: "c1",
      seriesId: null,
    });
    expect(events.rows.map((e) => e.id)).toEqual(["evt-1", "evt-3"]);
  });

  it("systemAbility acts without a session", async () => {
    (getAbility as jest.Mock).mockRejectedValue(new Error("no session"));
    expect(
      await cancelEvent("evt-3", "storm", { ability: systemAbility() })
    ).toEqual({
      churchId: "c2",
      seriesId: "s3",
    });
  });
});
