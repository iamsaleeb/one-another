jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    eventAttendee: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/domains/notifications/queue", () => ({
  scheduleEventReminderNotification: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/domains/events/questions/responses", () => ({
  saveResponses: jest.fn().mockResolvedValue(undefined),
}));

import { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { attendEvent, unattendEvent, registerEvent } from "../attendance";

const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockAttendeeFindUnique = prisma.eventAttendee.findUnique as jest.Mock;
const mockAttendeeCreate = prisma.eventAttendee.create as jest.Mock;
const mockAttendeeDelete = prisma.eventAttendee.delete as jest.Mock;
const mockAttendeeUpdate = prisma.eventAttendee.update as jest.Mock;

const mockQueue = jest.requireMock("@/domains/notifications/queue") as {
  scheduleEventReminderNotification: jest.Mock;
  cancelNotification: jest.Mock;
};
const mockSaveResponses = (
  jest.requireMock("@/domains/events/questions/responses") as {
    saveResponses: jest.Mock;
  }
).saveResponses;

const makePrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("test", {
    code,
    clientVersion: "0.0.0",
  });

const baseEvent = {
  id: "evt-1",
  title: "Test Event",
  datetime: new Date("2026-06-01T10:00:00Z"),
  isDraft: false,
  metadata: {},
  _count: { attendees: 0 },
};

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// attendEvent
// ---------------------------------------------------------------------------

describe("attendEvent", () => {
  it("returns error when event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    expect(await attendEvent("evt-1", "user-1")).toEqual({
      error: "Event not found.",
    });
  });

  it("returns error when event is a draft", async () => {
    mockEventFindUnique.mockResolvedValue({ ...baseEvent, isDraft: true });
    expect(await attendEvent("evt-1", "user-1")).toEqual({
      error: "Event not found.",
    });
  });

  it("creates attendee and schedules reminder on success", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });

    const result = await attendEvent("evt-1", "user-1");

    expect(result).toEqual({});
    expect(mockAttendeeCreate).toHaveBeenCalledWith({
      data: { eventId: "evt-1", userId: "user-1" },
    });
    expect(mockQueue.scheduleEventReminderNotification).toHaveBeenCalledWith(
      "user-1",
      baseEvent
    );
  });

  it("returns success silently when already attending (P2002 duplicate)", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeCreate.mockRejectedValue(makePrismaError("P2002"));

    const result = await attendEvent("evt-1", "user-1");

    expect(result).toEqual({});
    expect(mockQueue.scheduleEventReminderNotification).not.toHaveBeenCalled();
  });

  it("still succeeds when reminder scheduling fails", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });
    mockQueue.scheduleEventReminderNotification.mockRejectedValue(
      new Error("FCM down")
    );

    expect(await attendEvent("evt-1", "user-1")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// unattendEvent
// ---------------------------------------------------------------------------

describe("unattendEvent", () => {
  it("deletes attendee and cancels reminder on success", async () => {
    mockAttendeeDelete.mockResolvedValue({});

    const result = await unattendEvent("evt-1", "user-1");

    expect(result).toEqual({});
    expect(mockAttendeeDelete).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "evt-1", userId: "user-1" } },
    });
    expect(mockQueue.cancelNotification).toHaveBeenCalledWith({
      userId: "user-1",
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: "evt-1",
    });
  });

  it("returns success silently when record does not exist (P2025)", async () => {
    mockAttendeeDelete.mockRejectedValue(makePrismaError("P2025"));

    const result = await unattendEvent("evt-1", "user-1");

    expect(result).toEqual({});
    expect(mockQueue.cancelNotification).not.toHaveBeenCalled();
  });

  it("still succeeds when notification cancellation fails", async () => {
    mockAttendeeDelete.mockResolvedValue({});
    mockQueue.cancelNotification.mockRejectedValue(new Error("queue down"));

    expect(await unattendEvent("evt-1", "user-1")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// registerEvent
// ---------------------------------------------------------------------------

describe("registerEvent", () => {
  it("returns error when event does not exist", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    expect(await registerEvent("evt-1", "user-1", {})).toEqual({
      error: "Event not found.",
    });
  });

  it("returns error when event is a draft", async () => {
    mockEventFindUnique.mockResolvedValue({ ...baseEvent, isDraft: true });
    expect(await registerEvent("evt-1", "user-1", {})).toEqual({
      error: "Event not found.",
    });
  });

  it("returns error when event is fully booked", async () => {
    mockEventFindUnique.mockResolvedValue({
      ...baseEvent,
      metadata: { registration: { capacity: 2 } },
      _count: { attendees: 2 },
    });
    mockAttendeeFindUnique.mockResolvedValue(null);

    expect(await registerEvent("evt-1", "user-1", {})).toEqual({
      error: "Sorry, this event is fully booked.",
    });
  });

  it("creates attendee with phone and notes", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue(null);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });

    const result = await registerEvent("evt-1", "user-1", {
      phone: "0400000000",
      notes: "VIP",
    });

    expect(result).toEqual({ success: true });
    expect(mockAttendeeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "0400000000", notes: "VIP" }),
      })
    );
  });

  it("saves question responses after creating attendee", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue(null);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });

    const responses = [{ questionId: "q-1", answer: "yes" }];
    await registerEvent("evt-1", "user-1", { responses });

    expect(mockSaveResponses).toHaveBeenCalledWith("att-1", responses, "evt-1");
  });

  it("schedules a reminder notification after successful new registration", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue(null);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });

    await registerEvent("evt-1", "user-1", {});

    expect(mockQueue.scheduleEventReminderNotification).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: "evt-1", title: "Test Event" })
    );
  });

  it("updates existing attendee when re-registering", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue({ id: "att-existing" });
    mockAttendeeUpdate.mockResolvedValue({});

    const result = await registerEvent("evt-1", "user-1", {
      phone: "0411111111",
      notes: "Updated",
    });

    expect(result).toEqual({ success: true });
    expect(mockAttendeeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "att-existing" },
        data: expect.objectContaining({
          phone: "0411111111",
          notes: "Updated",
        }),
      })
    );
    expect(mockAttendeeCreate).not.toHaveBeenCalled();
  });

  it("saves responses when re-registering an existing attendee", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue({ id: "att-existing" });
    mockAttendeeUpdate.mockResolvedValue({});

    const responses = [{ questionId: "q-1", answer: "updated answer" }];
    await registerEvent("evt-1", "user-1", { responses });

    expect(mockSaveResponses).toHaveBeenCalledWith(
      "att-existing",
      responses,
      "evt-1"
    );
  });

  it("still succeeds when reminder scheduling fails after registration", async () => {
    mockEventFindUnique.mockResolvedValue(baseEvent);
    mockAttendeeFindUnique.mockResolvedValue(null);
    mockAttendeeCreate.mockResolvedValue({ id: "att-1" });
    mockQueue.scheduleEventReminderNotification.mockRejectedValue(
      new Error("FCM down")
    );

    expect(await registerEvent("evt-1", "user-1", {})).toEqual({
      success: true,
    });
  });

  describe("concurrent registration race condition", () => {
    it("handles P2002 by finding the raced record and saving responses", async () => {
      mockEventFindUnique.mockResolvedValue(baseEvent);
      mockAttendeeFindUnique
        .mockResolvedValueOnce(null) // pre-create check: not yet registered
        .mockResolvedValueOnce({ id: "att-raced" }); // post-P2002 lookup
      mockAttendeeCreate.mockRejectedValue(makePrismaError("P2002"));

      const responses = [{ questionId: "q-1", answer: "yes" }];
      const result = await registerEvent("evt-1", "user-1", { responses });

      expect(result).toEqual({ success: true });
      expect(mockSaveResponses).toHaveBeenCalledWith(
        "att-raced",
        responses,
        "evt-1"
      );
    });
  });

  describe("camp partial registration", () => {
    const campEvent = {
      ...baseEvent,
      datetime: new Date("2026-06-01T10:00:00Z"),
      metadata: {
        camp: {
          endDate: "2026-06-05",
          allowPartialRegistration: true,
          agenda: [],
        },
        registration: { capacity: null },
      },
    };

    it("returns error when camp event is missing a start date", async () => {
      mockEventFindUnique.mockResolvedValue({ ...campEvent, datetime: null });

      expect(
        await registerEvent("evt-1", "user-1", {
          selectedDays: ["2026-06-01"],
        })
      ).toEqual({
        error:
          "This camp event is missing a start date, so partial registration is unavailable.",
      });
    });

    it("returns error when no selected days fall within the camp range", async () => {
      mockEventFindUnique.mockResolvedValue(campEvent);

      expect(
        await registerEvent("evt-1", "user-1", {
          selectedDays: ["2026-05-30", "2026-06-10"],
        })
      ).toEqual({ error: "Please select at least one valid day to attend." });
    });

    it("filters out-of-range days and stores only valid ones on new registration", async () => {
      mockEventFindUnique.mockResolvedValue(campEvent);
      mockAttendeeFindUnique.mockResolvedValue(null);
      mockAttendeeCreate.mockResolvedValue({ id: "att-1" });

      await registerEvent("evt-1", "user-1", {
        selectedDays: ["2026-05-31", "2026-06-02", "2026-06-10"],
      });

      expect(mockAttendeeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { selectedDays: ["2026-06-02"] },
          }),
        })
      );
    });

    it("stores validated selected days when updating an existing attendee", async () => {
      mockEventFindUnique.mockResolvedValue(campEvent);
      mockAttendeeFindUnique.mockResolvedValue({ id: "att-existing" });
      mockAttendeeUpdate.mockResolvedValue({});

      await registerEvent("evt-1", "user-1", {
        selectedDays: ["2026-06-01", "2026-06-03"],
      });

      expect(mockAttendeeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { selectedDays: ["2026-06-01", "2026-06-03"] },
          }),
        })
      );
    });
  });
});
