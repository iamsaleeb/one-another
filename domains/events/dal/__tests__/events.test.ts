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

import { createPrismaAbility } from "@casl/prisma";
import { prisma } from "@/lib/db";
import { buildAbility, type AppAbility } from "@/domains/roles/lib/ability";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
import { systemAbility } from "@/domains/roles/lib/system-ability";
import { grants, type fakeTable } from "@/domains/roles/testing";
import type { Grants } from "@/domains/roles/lib/grants";
import type { CreateEventInput } from "../../validations/event";
import { cancelEvent, createEvent, deleteEvent, updateEvent } from "../events";

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
  scheduleEventReminderNotifications: jest.Mock;
  rescheduleEventReminderNotifications: jest.Mock;
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
    date: "2026-04-06",
    time: "09:00",
    location: "Hall",
    host: "Host",
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

    await updateEvent(
      "evt-1",
      input({ seriesId: "s1", churchId: undefined, isDraft: false })
    );

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
      publishedChanged: false,
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
      publishedChanged: false,
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

describe("draft state changes through updateEvent", () => {
  const publishDraft = (opts?: { ability: AppAbility }) =>
    updateEvent(
      "evt-1",
      input({ seriesId: "s1", churchId: undefined, isDraft: false }),
      opts
    );
  const row = (id: string) => events.rows.find((e) => e.id === id);

  beforeEach(() =>
    signIn(grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] }))
  );

  it("publishing a draft schedules reminders and notifies Series followers", async () => {
    mockAttendees.mockResolvedValue([{ userId: "a1" }, { userId: "a2" }]);
    mockFollowers.mockResolvedValue([{ userId: "f1" }]);
    const datetimeISO = "2026-07-01T09:00:00.000Z";

    const result = await updateEvent(
      "evt-1",
      input({
        seriesId: "s1",
        churchId: undefined,
        isDraft: false,
        title: "Bible Study",
        datetimeISO,
      })
    );

    expect(result).toMatchObject({ publishedChanged: true });
    expect(row("evt-1")?.isDraft).toBe(false);
    expect(mockQueue.scheduleEventReminderNotifications).toHaveBeenCalledWith(
      ["a1", "a2"],
      { id: "evt-1", title: "Bible Study", datetime: new Date(datetimeISO) }
    );
    expect(mockQueue.queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "f1",
        type: NotificationType.NEW_SERIES_SESSION,
        body: expect.stringContaining("Bible Study"),
        dedupeKey: "s1:evt-1",
      })
    );
  });

  it("a failing side effect does not fail the publish", async () => {
    mockAttendees.mockResolvedValue([{ userId: "a1" }]);
    mockFollowers.mockResolvedValue([{ userId: "f1" }]);
    mockQueue.scheduleEventReminderNotifications.mockRejectedValueOnce(
      new Error("scheduler down")
    );
    mockQueue.queueNotification.mockRejectedValueOnce(new Error("push down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(await publishDraft()).toMatchObject({ publishedChanged: true });
    expect(row("evt-1")?.isDraft).toBe(false);
    spy.mockRestore();
  });

  it("unpublishing cancels pending reminders instead of rescheduling them", async () => {
    Object.assign(row("evt-2") ?? {}, {
      datetime: new Date("2026-05-01T09:00:00Z"),
    });

    const result = await updateEvent(
      "evt-2",
      input({ isDraft: true, datetimeISO: "2026-06-01T09:00:00.000Z" })
    );

    expect(result).toMatchObject({ publishedChanged: true });
    expect(row("evt-2")?.isDraft).toBe(true);
    expect(mockQueue.cancelManyNotifications).toHaveBeenCalledWith({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: "evt-2",
    });
    expect(
      mockQueue.rescheduleEventReminderNotifications
    ).not.toHaveBeenCalled();
  });

  it("unpublishing a session cancels its pending new-session notification", async () => {
    Object.assign(row("evt-1") ?? {}, { isDraft: false });

    await updateEvent(
      "evt-1",
      input({ seriesId: "s1", churchId: undefined, isDraft: true })
    );

    expect(mockQueue.cancelManyNotifications).toHaveBeenCalledWith({
      type: NotificationType.NEW_SERIES_SESSION,
      dedupeKey: "s1:evt-1",
    });
  });

  it("an omitted isDraft keeps the current state and runs no side effects", async () => {
    const result = await updateEvent("evt-2", input({ title: "Renamed" }));

    expect(result).toMatchObject({ publishedChanged: false });
    expect(row("evt-2")).toMatchObject({ isDraft: false, title: "Renamed" });
    expect(mockQueue.queueNotification).not.toHaveBeenCalled();
    expect(mockQueue.cancelManyNotifications).not.toHaveBeenCalled();
  });

  it("a published Event must stay complete", async () => {
    const result = await updateEvent("evt-2", input({ title: "" }));

    expect(result).toHaveProperty("fieldErrors.title");
    expect(row("evt-2")?.title).toBe("Friday Night");
  });

  it("a draft may be saved incomplete", async () => {
    const result = await updateEvent(
      "evt-1",
      input({ seriesId: "s1", churchId: undefined, title: "", description: "" })
    );

    expect(result).not.toHaveProperty("fieldErrors");
    expect(row("evt-1")).toMatchObject({ isDraft: true, title: "" });
  });

  it("changing draft state needs publish, not just update", async () => {
    const updateOnly = createPrismaAbility([
      { action: "update", subject: "Event" },
    ]) as AppAbility;

    expect(await publishDraft({ ability: updateOnly })).toEqual({
      error: "Unauthorised.",
    });
    expect(row("evt-1")?.isDraft).toBe(true);
    expect(mockQueue.queueNotification).not.toHaveBeenCalled();
  });
});

describe("scoped writes", () => {
  it("no Grant on another Church's Event: nothing is written", async () => {
    signIn(grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] }));
    expect(await deleteEvent("evt-3")).toEqual({ error: "Unauthorised." });
    expect(
      await updateEvent("evt-3", input({ churchId: "c2", isDraft: true }))
    ).toEqual({ error: "Unauthorised." });
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
