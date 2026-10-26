jest.mock("next/cache", () => ({ updateTag: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));
// Real queue, with one function we can make fail to prove rollback.
jest.mock("@/domains/notifications/queue", () => {
  const actual = jest.requireActual("@/domains/notifications/queue");
  return {
    ...actual,
    queueNotificationForUsers: jest.fn(actual.queueNotificationForUsers),
  };
});

import { createPrismaAbility } from "@casl/prisma";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { queueNotificationForUsers } from "@/domains/notifications/queue";
import type { AppAbility } from "@/domains/roles/lib/ability";
import {
  as,
  attend,
  follow,
  makeChurch,
  makeEvent,
  makeSeries,
  makeUser,
  pending,
} from "@/test/db/factories";
import type { CreateEventInput } from "../validations/event";
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  saveEvent,
  uncancelEvent,
} from "../lifecycle";

const staleTags = () => (updateTag as jest.Mock).mock.calls.map((c) => c[0]);

const START = new Date("2030-06-01T10:00:00.000Z");
const REMINDER_AT = new Date("2030-06-01T08:00:00.000Z"); // default 2h before

// A complete Event, as the wizard sends it.
function input(over: Partial<CreateEventInput> = {}): CreateEventInput {
  return {
    title: "Sunday Worship",
    date: "2030-06-01",
    time: "10:00",
    datetimeISO: START.toISOString(),
    location: "Main Hall",
    host: "Pastor John",
    tag: "Worship",
    description: "Weekly service",
    churchId: "c1",
    questions: [],
    ...over,
  };
}

const admin = () =>
  as("admin", { church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] });

// c1 ── s1, s2        c2 ── s3
beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all(
    ["admin", "creator", "staff", "u1", "u2"].map((id) => makeUser(id))
  );
  await makeChurch("c1");
  await makeChurch("c2");
  await makeSeries("s1", "c1");
  await makeSeries("s2", "c1");
  await makeSeries("s3", "c2");
});

describe("createEvent", () => {
  it("refuses a guest and writes nothing", async () => {
    expect(await createEvent(input(), as(null))).toEqual({
      error: "Unauthorised.",
    });
    expect(await prisma.event.count()).toBe(0);
  });

  it("gives a Church EVENT_CREATOR the draft and a Creator Grant", async () => {
    const result = await createEvent(
      input({ isDraft: true }),
      as("creator", { church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
    );
    if (!("id" in result)) throw new Error(JSON.stringify(result));

    const event = await prisma.event.findUniqueOrThrow({
      where: { id: result.id },
    });
    expect(event).toMatchObject({ isDraft: true, createdById: "creator" });
    expect(
      await prisma.eventStaffAssignment.findMany({
        where: { eventId: result.id },
      })
    ).toEqual([
      expect.objectContaining({ userId: "creator", role: "EVENT_EDITOR" }),
    ]);
    // A draft joins no public list.
    expect(staleTags()).toEqual(
      expect.arrayContaining([`event-${result.id}`, "church-c1"])
    );
    expect(staleTags()).not.toContain("churches");
  });

  it("gives a Church EVENT_MANAGER no redundant Creator Grant", async () => {
    const result = await createEvent(
      input({ isDraft: true }),
      as("staff", { church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
    );
    if (!("id" in result)) throw new Error(JSON.stringify(result));
    expect(await prisma.eventStaffAssignment.count()).toBe(0);
  });

  it("places a session in its Series' Church, whatever Church was sent", async () => {
    const result = await createEvent(
      input({ isDraft: true, seriesId: "s1", churchId: "c2" }),
      as("staff", {
        series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }],
      })
    );
    if (!("id" in result)) throw new Error(JSON.stringify(result));

    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: result.id } })
    ).toMatchObject({ churchId: "c1", seriesId: "s1" });
    // A Series Grant is not enough to keep editing it, so it gets one.
    expect(await prisma.eventStaffAssignment.count()).toBe(1);
  });

  it("refuses Series staff outside their Series", async () => {
    expect(
      await createEvent(
        input({ isDraft: true, seriesId: "s2" }),
        as("staff", {
          series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }],
        })
      )
    ).toEqual({ error: "Unauthorised." });
  });

  it("asks for a Church when none can be found", async () => {
    expect(
      await createEvent(input({ isDraft: true, churchId: undefined }), admin())
    ).toEqual({ fieldErrors: { churchId: ["Church is required"] } });
  });

  it("refuses to publish an incomplete Event", async () => {
    const result = await createEvent(input({ title: "" }), admin());
    expect(result).toHaveProperty("fieldErrors.title");
    expect(await prisma.event.count()).toBe(0);
  });

  it("syncs questions and teaches them to the creator's library", async () => {
    const result = await createEvent(
      input({
        isDraft: true,
        questions: [
          {
            type: "SHORT_TEXT",
            label: "Dietary needs",
            options: [],
            required: false,
            order: 0,
          },
        ],
      }),
      admin()
    );
    if (!("id" in result)) throw new Error(JSON.stringify(result));

    expect(
      await prisma.eventQuestion.count({ where: { eventId: result.id } })
    ).toBe(1);
    expect(
      await prisma.questionLibraryItem.count({
        where: { createdById: "admin" },
      })
    ).toBe(1);
  });

  it("creates for a trusted caller with no user, without a Grant", async () => {
    const system = {
      ability: as("x", { isPlatformAdmin: true }).ability,
      userId: null,
    };
    const result = await createEvent(input({ isDraft: true }), system);
    if (!("id" in result)) throw new Error(JSON.stringify(result));

    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: result.id } })
    ).toMatchObject({ createdById: null });
    expect(await prisma.eventStaffAssignment.count()).toBe(0);
  });
});

describe("saveEvent", () => {
  it("refuses a Church EVENT_CREATOR with no Grant on the Event", async () => {
    await makeEvent({ id: "e1", churchId: "c1" });
    expect(
      await saveEvent(
        "e1",
        input({ title: "Changed" }),
        as("creator", { church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
      )
    ).toEqual({ error: "Unauthorised." });
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ title: "Event e1" });
  });

  it("reports a missing Event as not found", async () => {
    expect(await saveEvent("nope", input(), admin())).toEqual({
      error: "Event not found.",
    });
  });

  it("lets an Event editor edit their Event in place", async () => {
    await makeEvent({ id: "e1", churchId: "c1" });
    expect(
      await saveEvent(
        "e1",
        input({ title: "Changed" }),
        as("u1", { event: [{ eventId: "e1", role: "EVENT_EDITOR" }] })
      )
    ).toEqual({});
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ title: "Changed" });
  });

  describe("Owning Church", () => {
    const bothChurches = () =>
      as("admin", {
        church: [
          { churchId: "c1", role: "CHURCH_ADMIN" },
          { churchId: "c2", role: "CHURCH_ADMIN" },
        ],
      });
    const home = async () =>
      prisma.event.findUniqueOrThrow({
        where: { id: "e1" },
        select: { churchId: true, seriesId: true },
      });

    it("keeps a published Event in its Church, whatever Church was sent", async () => {
      await makeEvent({ id: "e1", churchId: "c1" });
      expect(
        await saveEvent("e1", input({ churchId: "c2" }), bothChurches())
      ).toEqual({});
      expect(await home()).toEqual({ churchId: "c1", seriesId: null });
    });

    it("keeps a session in its Series, whatever Series was sent", async () => {
      await makeEvent({ id: "e1", churchId: "c1", seriesId: "s1" });
      expect(
        await saveEvent("e1", input({ seriesId: "s3" }), bothChurches())
      ).toEqual({});
      expect(await home()).toEqual({ churchId: "c1", seriesId: "s1" });
    });

    it("keeps a standalone Event standalone", async () => {
      await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
      expect(
        await saveEvent(
          "e1",
          input({ isDraft: true, seriesId: "s1" }),
          bothChurches()
        )
      ).toEqual({});
      expect(await home()).toEqual({ churchId: "c1", seriesId: null });
    });

    it("lets a draft change Church, giving the mover the Creator Grant there", async () => {
      // Edits e1 only through the c1 Grant, so without the Creator Grant the
      // move to c2 would lock them out.
      await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
      expect(
        await saveEvent(
          "e1",
          input({ isDraft: true, churchId: "c2" }),
          as("u1", {
            church: [
              { churchId: "c1", role: "EVENT_MANAGER" },
              { churchId: "c2", role: "EVENT_CREATOR" },
            ],
          })
        )
      ).toEqual({});
      expect(await home()).toEqual({ churchId: "c2", seriesId: null });
      expect(
        await prisma.eventStaffAssignment.findMany({ where: { eventId: "e1" } })
      ).toEqual([
        expect.objectContaining({ userId: "u1", role: "EVENT_EDITOR" }),
      ]);
      expect(staleTags()).toEqual(
        expect.arrayContaining(["church-c1", "church-c2"])
      );
    });

    it("refuses to move a draft where the user may not create Events", async () => {
      await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
      expect(
        await saveEvent(
          "e1",
          input({ isDraft: true, churchId: "c2" }),
          as("u1", { event: [{ eventId: "e1", role: "EVENT_EDITOR" }] })
        )
      ).toEqual({ error: "Unauthorised." });
      expect(await home()).toEqual({ churchId: "c1", seriesId: null });
    });
  });

  it("syncs questions for a trusted caller without a library owner", async () => {
    await makeEvent({ id: "e1", churchId: "c1" });
    const system = {
      ability: as("x", { isPlatformAdmin: true }).ability,
      userId: null,
    };
    await saveEvent(
      "e1",
      input({
        questions: [
          {
            type: "SHORT_TEXT",
            label: "Allergies",
            options: [],
            required: true,
            order: 0,
          },
        ],
      }),
      system
    );
    expect(await prisma.eventQuestion.count({ where: { eventId: "e1" } })).toBe(
      1
    );
    expect(await prisma.questionLibraryItem.count()).toBe(0);
  });

  describe("draft state", () => {
    beforeEach(async () => {
      await makeEvent({
        id: "e1",
        churchId: "c1",
        seriesId: "s1",
        isDraft: true,
        datetime: START,
      });
      await attend("e1", "u1");
      await follow("s1", "u2");
    });

    it("publishing schedules attendee reminders and tells Series followers", async () => {
      expect(
        await saveEvent(
          "e1",
          input({ seriesId: "s1", isDraft: false }),
          admin()
        )
      ).toEqual({});

      expect(await pending("EVENT_REMINDER")).toEqual([
        expect.objectContaining({
          userId: "u1",
          dedupeKey: "e1",
          scheduledFor: REMINDER_AT,
        }),
      ]);
      expect(await pending("NEW_SERIES_SESSION")).toEqual([
        expect.objectContaining({ userId: "u2", dedupeKey: "s1:e1" }),
      ]);
      // It joined the public Church lists.
      expect(staleTags()).toContain("churches");
    });

    it("re-saving a published Event queues nothing new", async () => {
      await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin());
      await prisma.notification.updateMany({ data: { sentAt: new Date() } });

      await saveEvent(
        "e1",
        input({ seriesId: "s1", title: "Renamed" }),
        admin()
      );

      expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
      expect(await prisma.notification.count()).toBe(2);
    });

    it("unpublishing withdraws reminders and the new-session notice", async () => {
      await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin());
      expect(
        await saveEvent("e1", input({ seriesId: "s1", isDraft: true }), admin())
      ).toEqual({});

      expect(await pending("EVENT_REMINDER")).toEqual([]);
      expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
    });

    it("an omitted isDraft keeps the current state and queues nothing", async () => {
      await saveEvent("e1", input({ seriesId: "s1" }), admin());

      expect(
        await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
      ).toMatchObject({ isDraft: true });
      expect(await prisma.notification.count()).toBe(0);
    });

    it("a draft may be saved incomplete", async () => {
      expect(
        await saveEvent(
          "e1",
          input({ seriesId: "s1", title: "", location: "" }),
          admin()
        )
      ).toEqual({});
    });

    it("a published Event must stay complete, however it is saved", async () => {
      await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin());

      const result = await saveEvent(
        "e1",
        input({ seriesId: "s1", title: "" }),
        admin()
      );

      expect(result).toHaveProperty("fieldErrors.title");
      expect(
        await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
      ).toMatchObject({ title: "Sunday Worship" });
    });

    it("changing draft state needs publish, not just update", async () => {
      const updateOnly = createPrismaAbility([
        { action: "update", subject: "Event" },
      ]) as AppAbility;

      expect(
        await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), {
          ability: updateOnly,
          userId: "u1",
        })
      ).toEqual({ error: "Unauthorised." });
    });

    it("rescheduling a published Event moves its reminders", async () => {
      await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin());
      const later = new Date("2030-06-02T18:00:00.000Z");

      await saveEvent(
        "e1",
        input({ seriesId: "s1", datetimeISO: later.toISOString() }),
        admin()
      );

      expect(await pending("EVENT_REMINDER")).toEqual([
        expect.objectContaining({
          scheduledFor: new Date("2030-06-02T16:00:00.000Z"),
        }),
      ]);
    });

    it("a failure part-way through rolls the whole change back", async () => {
      (queueNotificationForUsers as jest.Mock).mockRejectedValueOnce(
        new Error("queue down")
      );

      await expect(
        saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin())
      ).rejects.toThrow("queue down");

      expect(
        await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
      ).toMatchObject({ isDraft: true });
      expect(await prisma.notification.count()).toBe(0);
      expect(updateTag).not.toHaveBeenCalled();
    });
  });
});

describe("publishing needs a start time still to come", () => {
  const PAST = new Date("2020-06-01T10:00:00.000Z");
  const past = { date: "2020-06-01", datetimeISO: PAST.toISOString() };

  it("refuses to create a published Event in the past", async () => {
    expect(await createEvent(input(past), admin())).toEqual({
      fieldErrors: { date: ["Date must be in the future"] },
    });
    expect(await prisma.event.count()).toBe(0);
  });

  it("refuses to publish a draft dated in the past", async () => {
    await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
    expect(
      await saveEvent("e1", input({ ...past, isDraft: false }), admin())
    ).toHaveProperty("fieldErrors.date");
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ isDraft: true });
  });

  it("refuses to move a published Event into the past", async () => {
    await makeEvent({ id: "e1", churchId: "c1", datetime: START });
    expect(await saveEvent("e1", input(past), admin())).toHaveProperty(
      "fieldErrors.date"
    );
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ datetime: START });
  });

  it("lets a draft keep a past date", async () => {
    await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
    expect(await saveEvent("e1", input(past), admin())).toEqual({});
  });
});

describe("Category", () => {
  const category = async () =>
    (await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })).tag;

  it("is fixed once published, whatever Category was sent", async () => {
    await makeEvent({ id: "e1", churchId: "c1", datetime: START });
    expect(
      await saveEvent(
        "e1",
        input({ tag: "Camp", campEndDate: "2030-06-03" }),
        admin()
      )
    ).toEqual({});
    expect(await category()).toBe("Worship");
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).not.toHaveProperty("metadata.camp");
  });

  it("may still change on a draft", async () => {
    await makeEvent({ id: "e1", churchId: "c1", isDraft: true });
    await saveEvent("e1", input({ tag: "Youth" }), admin());
    expect(await category()).toBe("Youth");
  });
});

describe("an Event that has happened", () => {
  const PAST = new Date("2020-06-01T10:00:00.000Z");

  beforeEach(async () => {
    await makeEvent({
      id: "e1",
      churchId: "c1",
      title: "Picnic",
      description: "Before",
      datetime: PAST,
    });
  });

  const event = () => prisma.event.findUniqueOrThrow({ where: { id: "e1" } });

  it("cannot be edited", async () => {
    expect(
      await saveEvent(
        "e1",
        input({ title: "Renamed", description: "After" }),
        admin()
      )
    ).toEqual({ error: "This event has already happened." });
    expect(await event()).toMatchObject({
      title: "Picnic",
      description: "Before",
    });
  });

  it("refuses a user with no Grant as unauthorised", async () => {
    expect(await saveEvent("e1", input(), as("u2"))).toEqual({
      error: "Unauthorised.",
    });
  });

  it("cannot be unpublished", async () => {
    expect(await saveEvent("e1", input({ isDraft: true }), admin())).toEqual({
      error: "This event has already happened.",
    });
    expect(await event()).toMatchObject({ isDraft: false });
  });

  it("cannot be cancelled or un-cancelled", async () => {
    expect(await cancelEvent("e1", "Rain", admin())).toEqual({
      error: "This event has already happened.",
    });
    await prisma.event.update({
      where: { id: "e1" },
      data: { cancelledAt: PAST, cancellationReason: "Rain" },
    });
    expect(await uncancelEvent("e1", admin())).toEqual({
      error: "This event has already happened.",
    });
    expect(await event()).toMatchObject({ cancellationReason: "Rain" });
  });

  it("can still be deleted", async () => {
    expect(await deleteEvent("e1", admin())).toEqual({});
  });
});

describe("cancelEvent and uncancelEvent", () => {
  beforeEach(async () => {
    await makeEvent({ id: "e1", churchId: "c1", datetime: START });
    await attend("e1", "u1");
    await saveEvent("e1", input({ title: "Picnic", isDraft: false }), admin());
    jest.clearAllMocks();
  });

  it("cancel withdraws reminders and tells attendees", async () => {
    expect(await cancelEvent("e1", "Rain", admin())).toEqual({});

    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ cancellationReason: "Rain" });
    expect(await pending("EVENT_REMINDER")).toEqual([]);
    expect(await pending("EVENT_CANCELLED")).toEqual([
      expect.objectContaining({
        userId: "u1",
        body: "Picnic has been cancelled",
        dedupeKey: "cancelled:e1",
      }),
    ]);
    expect(staleTags()).toEqual(
      expect.arrayContaining(["event-e1", "church-c1"])
    );
  });

  it("refuses a user with no Grant on the Event", async () => {
    expect(await cancelEvent("e1", "Rain", as("u2"))).toEqual({
      error: "Unauthorised.",
    });
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ cancelledAt: null });
  });

  it("uncancel clears the cancellation", async () => {
    await cancelEvent("e1", "Rain", admin());

    expect(await uncancelEvent("e1", admin())).toEqual({});
    expect(
      await prisma.event.findUniqueOrThrow({ where: { id: "e1" } })
    ).toMatchObject({ cancelledAt: null, cancellationReason: null });
  });

  it("uncancel reports a missing Event", async () => {
    expect(await uncancelEvent("nope", admin())).toEqual({
      error: "Event not found.",
    });
  });
});

// Each attendee has exactly one pending reminder exactly when the Event is
// published, not cancelled and still ahead, with its time and title.
describe("reminders follow the Event", () => {
  beforeEach(async () => {
    await makeEvent({
      id: "e1",
      churchId: "c1",
      seriesId: "s1",
      isDraft: true,
      datetime: START,
    });
    await attend("e1", "u1");
    await follow("s1", "u2");
    await saveEvent(
      "e1",
      input({ seriesId: "s1", title: "Picnic", isDraft: false }),
      admin()
    );
    jest.clearAllMocks();
  });

  it("uncancel restores the reminders cancel withdrew", async () => {
    await cancelEvent("e1", "Rain", admin());
    await uncancelEvent("e1", admin());

    expect(await pending("EVENT_REMINDER")).toEqual([
      expect.objectContaining({ userId: "u1", scheduledFor: REMINDER_AT }),
    ]);
  });

  it("uncancel withdraws the cancellation notice if it has not gone out", async () => {
    await cancelEvent("e1", "Rain", admin());
    await uncancelEvent("e1", admin());

    expect(await pending("EVENT_CANCELLED")).toEqual([]);
  });

  it("cancel withdraws the new-session notice, and uncancel does not resend it", async () => {
    await cancelEvent("e1", "Rain", admin());
    expect(await pending("NEW_SERIES_SESSION")).toEqual([]);

    await uncancelEvent("e1", admin());
    expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
  });

  it("renaming rewrites the reminder's text", async () => {
    await saveEvent(
      "e1",
      input({ seriesId: "s1", title: "Beach Day" }),
      admin()
    );

    const [reminder] = await pending("EVENT_REMINDER");
    expect(reminder.body).toBe("Beach Day starts in 2 hours");
    expect(reminder.data).toMatchObject({ eventTitle: "Beach Day" });
  });

  it("a cancelled Event gets no reminders, even when rescheduled", async () => {
    await cancelEvent("e1", "Rain", admin());
    await saveEvent(
      "e1",
      input({ seriesId: "s1", datetimeISO: "2030-07-01T10:00:00.000Z" }),
      admin()
    );

    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("a reminder that has gone out is left alone", async () => {
    await prisma.notification.updateMany({
      where: { type: "EVENT_REMINDER" },
      data: { sentAt: new Date() },
    });

    await saveEvent(
      "e1",
      input({ seriesId: "s1", title: "Beach Day" }),
      admin()
    );

    const [sent] = await prisma.notification.findMany({
      where: { type: "EVENT_REMINDER" },
    });
    expect(sent.body).toBe("Picnic starts in 2 hours");
    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("an Event whose reminder time has passed gets none", async () => {
    const soon = new Date(Date.now() + 30 * 60_000);
    await saveEvent(
      "e1",
      input({ seriesId: "s1", datetimeISO: soon.toISOString() }),
      admin()
    );

    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("deleting a published Event tells its attendees, without a link", async () => {
    await deleteEvent("e1", admin());

    const [notice] = await pending("EVENT_CANCELLED");
    expect(notice).toMatchObject({
      userId: "u1",
      body: "Picnic has been cancelled",
    });
    expect(notice.data).not.toHaveProperty("eventId");
  });
});

describe("deleteEvent", () => {
  beforeEach(async () => {
    await makeEvent({
      id: "e1",
      churchId: "c1",
      seriesId: "s1",
      isDraft: true,
      datetime: START,
    });
    await attend("e1", "u1");
    await follow("s1", "u2");
    await saveEvent("e1", input({ seriesId: "s1", isDraft: false }), admin());
    jest.clearAllMocks();
  });

  it("deletes the Event and withdraws what was queued for it", async () => {
    expect(await deleteEvent("e1", admin())).toEqual({});

    expect(await prisma.event.count()).toBe(0);
    expect(await pending("EVENT_REMINDER")).toEqual([]);
    expect(await pending("NEW_SERIES_SESSION")).toEqual([]);
    expect(staleTags()).toEqual(
      expect.arrayContaining(["churches", "church-c1", "series-s1"])
    );
  });

  it("refuses a user with no Grant and deletes nothing", async () => {
    expect(await deleteEvent("e1", as("u2"))).toEqual({
      error: "Unauthorised.",
    });
    expect(await prisma.event.count()).toBe(1);
  });
});
