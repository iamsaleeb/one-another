jest.mock("next/cache", () => ({ updateTag: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  as,
  makeChurch,
  makeEvent,
  makeUser,
  pending,
} from "@/test/db/factories";
import { attendEvent, cancelEvent, unattendEvent } from "../lifecycle";

const staleTags = () => (updateTag as jest.Mock).mock.calls.map((c) => c[0]);

const START = new Date("2030-06-01T10:00:00.000Z");
// Ends two days later, so as a camp it runs 1 to 3 June.
const CAMP_END = new Date("2030-06-03T15:00:00.000Z");
const REMINDER_AT = new Date("2030-06-01T08:00:00.000Z"); // default 2h before

const attendees = (eventId = "e1") =>
  prisma.eventAttendee.findMany({
    where: { eventId },
    orderBy: { userId: "asc" },
    include: { responses: { orderBy: { questionId: "asc" } } },
  });

function makeRegistrationEvent(
  capacity: number | null = null,
  extra: Record<string, unknown> = {}
) {
  return makeEvent({
    id: "e1",
    churchId: "c1",
    datetime: START,
    endDatetime: CAMP_END,
    requiresRegistration: true,
    metadata: {
      registration: { capacity, collectPhone: true, collectNotes: true },
      ...extra,
    },
  });
}

function makeQuestion(id: string, required: boolean) {
  return prisma.eventQuestion.create({
    data: {
      id,
      eventId: "e1",
      type: "SHORT_TEXT",
      label: id,
      options: [],
      required,
      order: 0,
    },
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all(["admin", "u1", "u2", "u3"].map((id) => makeUser(id)));
  await makeChurch("c1");
});

describe("attendEvent", () => {
  beforeEach(async () => {
    await makeEvent({ id: "e1", churchId: "c1", datetime: START });
  });

  it("refuses a guest and writes nothing", async () => {
    expect(await attendEvent("e1", {}, as(null))).toEqual({
      error: "You must be signed in.",
    });
    expect(await attendees()).toEqual([]);
  });

  it("refuses a missing Event and a draft", async () => {
    await makeEvent({ id: "draft", churchId: "c1", isDraft: true });

    expect(await attendEvent("nope", {}, as("u1"))).toEqual({
      error: "Event not found.",
    });
    expect(await attendEvent("draft", {}, as("u1"))).toEqual({
      error: "Event not found.",
    });
    expect(await attendees("draft")).toEqual([]);
  });

  it("refuses a cancelled Event and queues no reminder", async () => {
    await prisma.event.update({
      where: { id: "e1" },
      data: { cancelledAt: new Date() },
    });

    expect(await attendEvent("e1", {}, as("u1"))).toEqual({
      error: "This event has been cancelled.",
    });
    expect(await attendees()).toEqual([]);
    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("refuses an Event that has ended but not one that is Live", async () => {
    const hourAgo = new Date(Date.now() - 60 * 60_000);
    await prisma.event.update({
      where: { id: "e1" },
      data: { datetime: hourAgo, endDatetime: new Date(Date.now() - 60_000) },
    });

    expect(await attendEvent("e1", {}, as("u1"))).toEqual({
      error: "This event has ended.",
    });
    expect(await attendees()).toEqual([]);

    await prisma.event.update({
      where: { id: "e1" },
      data: { endDatetime: new Date(Date.now() + 60 * 60_000) },
    });
    expect(await attendEvent("e1", {}, as("u1"))).toEqual({});
  });

  it("adds the Attendee with a reminder at their preferred time", async () => {
    await prisma.notificationPreference.create({
      data: {
        userId: "u2",
        type: "EVENT_REMINDER",
        config: { hoursBeforeEvent: 1 },
      },
    });

    expect(await attendEvent("e1", {}, as("u1"))).toEqual({});
    expect(await attendEvent("e1", {}, as("u2"))).toEqual({});

    expect(await pending("EVENT_REMINDER")).toEqual([
      expect.objectContaining({
        userId: "u1",
        dedupeKey: "e1",
        scheduledFor: REMINDER_AT,
        body: "Event e1 starts in 2 hours",
      }),
      expect.objectContaining({
        userId: "u2",
        scheduledFor: new Date("2030-06-01T09:00:00.000Z"),
        body: "Event e1 starts in 1 hour",
      }),
    ]);
  });

  it("is idempotent: attending twice keeps one Attendee and one reminder", async () => {
    await attendEvent("e1", {}, as("u1"));
    await attendEvent("e1", {}, as("u1"));

    expect(await attendees()).toHaveLength(1);
    expect(await pending("EVENT_REMINDER")).toHaveLength(1);
  });

  it("leaves other Attendees' reminders as they were", async () => {
    await attendEvent("e1", {}, as("u1"));
    const [before] = await pending("EVENT_REMINDER");

    await attendEvent("e1", {}, as("u2"));

    const after = await prisma.notification.findUnique({
      where: { id: before.id },
    });
    expect(after).toEqual(before);
  });

  it("queues no reminder once its time has passed", async () => {
    await makeEvent({
      id: "soon",
      churchId: "c1",
      datetime: new Date(Date.now() + 30 * 60_000),
    });

    expect(await attendEvent("soon", {}, as("u1"))).toEqual({});
    expect(await attendees("soon")).toHaveLength(1);
    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("invalidates only this Attendee's view of the Event", async () => {
    await attendEvent("e1", {}, as("u1"));

    expect(staleTags()).toEqual(
      expect.arrayContaining([
        "event-e1",
        "event-questions-e1",
        "user-attendance-u1-e1",
        "user-events-u1",
        "user-responses-e1-u1",
      ])
    );
    expect(staleTags()).not.toContain("events-list");
  });

  it("waits for a concurrent cancel: a cancelled Event keeps no reminder", async () => {
    const admin = as("admin", {
      church: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });

    await Promise.all([
      attendEvent("e1", {}, as("u1")),
      cancelEvent("e1", "Rain", admin),
    ]);

    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });
});

describe("attendEvent on an Event that requires registration", () => {
  it("stores the registration and its answers", async () => {
    await makeRegistrationEvent();
    await makeQuestion("q1", true);

    expect(
      await attendEvent(
        "e1",
        {
          phone: "07700000000",
          notes: "Vegetarian",
          responses: [{ questionId: "q1", answer: "Yes", fileUrl: null }],
        },
        as("u1")
      )
    ).toEqual({});

    expect(await attendees()).toEqual([
      expect.objectContaining({
        userId: "u1",
        phone: "07700000000",
        notes: "Vegetarian",
        responses: [
          expect.objectContaining({ questionId: "q1", answer: "Yes" }),
        ],
      }),
    ]);
    expect(await pending("EVENT_REMINDER")).toHaveLength(1);
  });

  it("refuses a bare attend that skips a required question, writing nothing", async () => {
    await makeRegistrationEvent();
    await makeQuestion("q1", true);

    expect(await attendEvent("e1", {}, as("u1"))).toEqual({
      error: "All required questions must be answered before registering.",
    });
    expect(
      await attendEvent(
        "e1",
        { responses: [{ questionId: "q1", answer: "   ", fileUrl: null }] },
        as("u1")
      )
    ).toEqual({
      error: "All required questions must be answered before registering.",
    });
    expect(await attendees()).toEqual([]);
    expect(await pending("EVENT_REMINDER")).toEqual([]);
  });

  it("accepts a file as an answer, and drops foreign questions and non-https links", async () => {
    await makeRegistrationEvent();
    await makeQuestion("q1", true);
    await makeQuestion("q2", false);

    await attendEvent(
      "e1",
      {
        responses: [
          { questionId: "q1", answer: null, fileUrl: "https://blob/x.pdf" },
          { questionId: "q2", answer: null, fileUrl: "http://evil/x.pdf" },
          { questionId: "elsewhere", answer: "hack", fileUrl: null },
        ],
      },
      as("u1")
    );

    const [attendee] = await attendees();
    expect(attendee.responses).toEqual([
      expect.objectContaining({
        questionId: "q1",
        fileUrl: "https://blob/x.pdf",
      }),
    ]);
  });

  it("updates a registration when attending again", async () => {
    await makeRegistrationEvent(1);
    await makeQuestion("q1", false);

    await attendEvent(
      "e1",
      {
        phone: "1",
        responses: [{ questionId: "q1", answer: "A", fileUrl: null }],
      },
      as("u1")
    );
    // A full Event still lets its own Attendee change their answers.
    expect(
      await attendEvent(
        "e1",
        {
          phone: "2",
          responses: [{ questionId: "q1", answer: "B", fileUrl: null }],
        },
        as("u1")
      )
    ).toEqual({});

    expect(await attendees()).toEqual([
      expect.objectContaining({
        phone: "2",
        responses: [expect.objectContaining({ answer: "B" })],
      }),
    ]);
  });

  it("refuses a new Attendee once the Event is full", async () => {
    await makeRegistrationEvent(1);

    expect(await attendEvent("e1", {}, as("u1"))).toEqual({});
    expect(await attendEvent("e1", {}, as("u2"))).toEqual({
      error: "Sorry, this event is fully booked.",
    });
    expect(await attendees()).toHaveLength(1);
  });

  it("never overbooks under concurrent joins", async () => {
    await makeRegistrationEvent(2);

    const results = await Promise.all(
      ["u1", "u2", "u3"].map((u) => attendEvent("e1", {}, as(u)))
    );

    expect(await attendees()).toHaveLength(2);
    expect(results.filter((r) => "error" in r)).toEqual([
      { error: "Sorry, this event is fully booked." },
    ]);
  });

  describe("camp with partial registration", () => {
    const camp = {
      camp: {
        allowPartialRegistration: true,
        agenda: [],
      },
    };

    it("keeps only the chosen days inside the camp", async () => {
      await makeRegistrationEvent(null, camp);

      await attendEvent(
        "e1",
        {
          selectedDays: [
            "2030-05-31",
            "2030-06-01",
            "2030-06-03",
            "2030-06-04",
          ],
        },
        as("u1")
      );

      const [attendee] = await attendees();
      expect(attendee.metadata).toEqual({
        selectedDays: ["2030-06-01", "2030-06-03"],
      });
    });

    it("takes the camp's days in its timezone", async () => {
      await makeRegistrationEvent(null, camp);
      // 10:00 UTC on 1 June to 15:00 UTC on 3 June is 1 to 4 June in Auckland.
      await prisma.event.update({
        where: { id: "e1" },
        data: { timezone: "Pacific/Auckland" },
      });

      await attendEvent(
        "e1",
        { selectedDays: ["2030-06-01", "2030-06-04"] },
        as("u1")
      );

      const [attendee] = await attendees();
      expect(attendee.metadata).toEqual({
        selectedDays: ["2030-06-01", "2030-06-04"],
      });
    });

    it("refuses when no chosen day is inside the camp", async () => {
      await makeRegistrationEvent(null, camp);

      expect(
        await attendEvent("e1", { selectedDays: ["2030-07-01"] }, as("u1"))
      ).toEqual({ error: "Please select at least one valid day to attend." });
      expect(await attendees()).toEqual([]);
    });
  });
});

describe("unattendEvent", () => {
  beforeEach(async () => {
    await makeRegistrationEvent();
    await makeQuestion("q1", false);
    for (const u of ["u1", "u2"]) {
      await attendEvent(
        "e1",
        { responses: [{ questionId: "q1", answer: u, fileUrl: null }] },
        as(u)
      );
    }
    jest.clearAllMocks();
  });

  it("removes the Attendee, their answers and their reminder only", async () => {
    expect(await unattendEvent("e1", as("u1"))).toEqual({});

    expect(await attendees()).toEqual([
      expect.objectContaining({ userId: "u2" }),
    ]);
    expect(await prisma.eventAttendeeResponse.count()).toBe(1);
    expect(await pending("EVENT_REMINDER")).toEqual([
      expect.objectContaining({ userId: "u2" }),
    ]);
    expect(staleTags()).toEqual(
      expect.arrayContaining(["event-e1", "user-attendance-u1-e1"])
    );
  });

  it("changes nothing for someone not attending", async () => {
    expect(await unattendEvent("e1", as("u3"))).toEqual({});
    expect(await attendees()).toHaveLength(2);
    expect(await pending("EVENT_REMINDER")).toHaveLength(2);
  });

  it("lets an Attendee leave a cancelled Event", async () => {
    await prisma.event.update({
      where: { id: "e1" },
      data: { cancelledAt: new Date() },
    });

    expect(await unattendEvent("e1", as("u1"))).toEqual({});
    expect(await attendees()).toHaveLength(1);
  });

  it("refuses a guest", async () => {
    expect(await unattendEvent("e1", as(null))).toEqual({
      error: "You must be signed in.",
    });
    expect(await attendees()).toHaveLength(2);
  });
});
