jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventStaffAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    seriesStaffAssignment: {
      findUnique: jest.fn(),
    },
    series: {
      findUnique: jest.fn(),
    },
    eventAttendee: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    seriesFollower: {
      findMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/domains/notifications/queue", () => ({
  queueNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelManyNotifications: jest.fn(),
  rescheduleEventReminderNotifications: jest.fn(),
  scheduleEventReminderNotifications: jest.fn(),
  updateUserReminderSchedule: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

jest.mock("@/domains/events/questions/dal", () => ({
  syncEventQuestions: jest.fn().mockResolvedValue(undefined),
  getQuestionLibraryForUser: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/domains/events/dal/attendance", () => ({
  attendEvent: jest.fn(),
  unattendEvent: jest.fn(),
  registerEvent: jest.fn(),
}));

import { NotificationType } from "@prisma/client";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import {
  cancelEventAction,
  uncancelEventAction,
  deleteEventAction,
  saveDraftAction,
  saveEventAction,
} from "@/domains/events/actions/crud";
import {
  attendEventAction,
  unattendEventAction,
  registerEventAction,
} from "@/domains/events/actions/attendance";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
import { buildAbility } from "@/domains/roles/lib/ability";
import type { Grants } from "@/domains/roles/lib/grants";
import { grants, matchesWhere } from "@/domains/roles/testing";
import {
  registerEvent as _registerEvent,
  attendEvent as _attendEvent,
  unattendEvent as _unattendEvent,
} from "@/domains/events/dal/attendance";

const mockRedirect = redirect as unknown as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockEventCreate = prisma.event.create as jest.Mock;
const mockEventUpdate = prisma.event.update as jest.Mock;
const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockEventDelete = prisma.event.delete as jest.Mock;
const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock;
const mockEventAttendeeFindUnique = prisma.eventAttendee
  .findUnique as jest.Mock;
const mockSeriesFollowerFindMany = prisma.seriesFollower.findMany as jest.Mock;
const mockStaffCreate = prisma.eventStaffAssignment.create as jest.Mock;
const mockQueueNotification = jest.requireMock("@/domains/notifications/queue")
  .queueNotification as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockGetAbility = getAbility as jest.Mock;
const mockGetSessionUserId = getSessionUserId as jest.Mock;
const mockRegisterEvent = _registerEvent as jest.Mock;
const mockAttendEvent = _attendEvent as jest.Mock;
const mockUnattendEvent = _unattendEvent as jest.Mock;

// Signs in with real Grants. Default is a platform admin so tests that only
// exercise behaviour (not permissions) pass any Church/Series id.
function signInAs(
  opts: { id?: string; canResult?: boolean; grants?: Grants } = {}
) {
  mockGetSessionUserId.mockResolvedValue(opts.id ?? "user-1");
  const g =
    opts.grants ??
    (opts.canResult === false ? grants() : grants({ isPlatformAdmin: true }));
  mockGetAbility.mockResolvedValue(buildAbility(g));
}

function signOut() {
  mockGetSessionUserId.mockResolvedValue(null);
  mockGetAbility.mockResolvedValue(buildAbility(null));
}
const validData = {
  title: "Sunday Worship",
  date: "2026-04-06",
  time: "09:00",
  location: "Main Hall",
  host: "Pastor John",
  tag: "Youth Meeting",
  description: "Weekly Sunday service",
  churchId: "ch-1",
  questions: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: {
      id: "user-1",
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });
  signInAs();
  // The DAL loads Events through a permission-scoped findFirst. Serve it from
  // the findUnique fixture, filtered by the real CASL where clause.
  (prisma.event.findFirst as jest.Mock).mockImplementation(
    async ({ where }: { where: { id: string } }) => {
      const row = await mockEventFindUnique({ where: { id: where.id } });
      if (!row) return null;
      const record = { id: where.id, seriesId: null, ...row };
      return matchesWhere(where, record) ? record : null;
    }
  );
  (prisma.event.count as jest.Mock).mockImplementation(
    async ({ where }: { where: { id: string } }) =>
      (await mockEventFindUnique({ where })) ? 1 : 0
  );
  mockSeriesFollowerFindMany.mockResolvedValue([]);
  mockEventAttendeeFindMany.mockResolvedValue([]);
  mockEventAttendeeFindUnique.mockResolvedValue(null);
  mockAttendEvent.mockResolvedValue({});
  mockUnattendEvent.mockResolvedValue({});
  mockRegisterEvent.mockResolvedValue({ success: true });
});

describe("saveDraftAction", () => {
  it("creates a draft owned by the user and returns its id", async () => {
    mockEventCreate.mockResolvedValue({ id: "evt-new" });

    const result = await saveDraftAction(undefined, {
      ...validData,
      title: "Half done",
    });

    expect(result).toEqual({ eventId: "evt-new" });
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Half done",
          isDraft: true,
          churchId: "ch-1",
          createdById: "user-1",
        }),
      })
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-new");
  });

  it("places a session in its Series' Church, ignoring the submitted Church", async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: "ch-from-series" });
    mockEventCreate.mockResolvedValue({ id: "evt-s" });

    await saveDraftAction(undefined, {
      ...validData,
      seriesId: "ser-1",
      churchId: "ch-submitted",
    });

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          seriesId: "ser-1",
          churchId: "ch-from-series",
        }),
      })
    );
  });

  it("gives a Church EVENT_CREATOR a Creator Grant on the new draft", async () => {
    signInAs({
      grants: grants({ church: [{ churchId: "ch-1", role: "EVENT_CREATOR" }] }),
    });
    mockEventCreate.mockResolvedValue({ id: "evt-c" });

    await saveDraftAction(undefined, validData);

    expect(mockStaffCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        eventId: "evt-c",
        role: "EVENT_EDITOR",
      }),
    });
  });

  it("refuses a user who may not create Events in the Church", async () => {
    signInAs({ canResult: false });

    expect(await saveDraftAction(undefined, validData)).toEqual({
      error: "Unauthorised.",
    });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("refuses a guest", async () => {
    signOut();

    expect(await saveDraftAction(undefined, validData)).toEqual({
      error: "Unauthorised.",
    });
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("returns a fieldError when no Church is given", async () => {
    const result = await saveDraftAction(undefined, {
      ...validData,
      churchId: "",
    });

    expect(result).toHaveProperty("fieldErrors.churchId");
    expect(mockEventCreate).not.toHaveBeenCalled();
  });

  it("updates an existing draft and leaves its draft state alone", async () => {
    mockEventFindUnique.mockResolvedValue({
      churchId: "ch-1",
      datetime: null,
      isDraft: true,
    });
    mockEventUpdate.mockResolvedValue({});

    const result = await saveDraftAction("evt-1", {
      ...validData,
      title: "Renamed",
    });

    expect(result).toEqual({ eventId: "evt-1" });
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "evt-1" }),
        data: expect.objectContaining({ title: "Renamed" }),
      })
    );
    expect(mockEventUpdate.mock.calls[0][0].data).not.toHaveProperty("isDraft");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("reports a missing draft as not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);

    expect(await saveDraftAction("evt-gone", validData)).toEqual({
      error: "Event not found.",
    });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });
});

describe("publishing and unpublishing from the wizard", () => {
  const queue = jest.requireMock("@/domains/notifications/queue") as {
    scheduleEventReminderNotifications: jest.Mock;
    cancelManyNotifications: jest.Mock;
  };
  const draftInSeries = {
    churchId: "ch-1",
    seriesId: "ser-1",
    datetime: null,
    isDraft: true,
  };

  beforeEach(() => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: "ch-1" });
    mockEventUpdate.mockResolvedValue({});
  });

  it("Publish (saveEventAction) notifies Series followers and schedules reminders", async () => {
    mockEventFindUnique.mockResolvedValue(draftInSeries);
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: "attendee-1" }]);
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: "follower-1" }]);

    const result = await saveEventAction("evt-1", {
      ...validData,
      seriesId: "ser-1",
      isDraft: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "follower-1",
        type: NotificationType.NEW_SERIES_SESSION,
        title: "New Session Added",
        dedupeKey: "ser-1:evt-1",
      })
    );
    expect(queue.scheduleEventReminderNotifications).toHaveBeenCalledWith(
      ["attendee-1"],
      expect.objectContaining({ id: "evt-1", title: "Sunday Worship" })
    );
    // The Event now shows in public Church lists.
    expect(mockUpdateTag).toHaveBeenCalledWith("churches");
  });

  it("re-saving a published Event sends nothing again", async () => {
    mockEventFindUnique.mockResolvedValue({ ...draftInSeries, isDraft: false });
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: "follower-1" }]);

    await saveEventAction("evt-1", {
      ...validData,
      seriesId: "ser-1",
      isDraft: false,
    });

    expect(mockQueueNotification).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalledWith("churches");
  });

  it("Save as Draft on a published Event cancels what was queued for it", async () => {
    mockEventFindUnique.mockResolvedValue({ ...draftInSeries, isDraft: false });

    const result = await saveDraftAction("evt-1", {
      ...validData,
      seriesId: "ser-1",
      isDraft: true,
    });

    expect(result).toEqual({ eventId: "evt-1" });
    expect(queue.cancelManyNotifications).toHaveBeenCalledWith({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: "evt-1",
    });
    expect(queue.cancelManyNotifications).toHaveBeenCalledWith({
      type: NotificationType.NEW_SERIES_SESSION,
      dedupeKey: "ser-1:evt-1",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("churches");
  });

  it("auto-save on a published Event keeps it published", async () => {
    mockEventFindUnique.mockResolvedValue({ ...draftInSeries, isDraft: false });
    const { isDraft: _omitted, ...withoutDraftFlag } = {
      ...validData,
      isDraft: undefined,
    };

    await saveDraftAction("evt-1", {
      ...withoutDraftFlag,
      seriesId: "ser-1",
      title: "Renamed",
    });

    const data = mockEventUpdate.mock.calls[0][0].data;
    expect(data.title).toBe("Renamed");
    expect(data).not.toHaveProperty("isDraft");
    expect(queue.cancelManyNotifications).not.toHaveBeenCalled();
  });

  it("auto-save cannot blank a published Event", async () => {
    mockEventFindUnique.mockResolvedValue({ ...draftInSeries, isDraft: false });

    const result = await saveDraftAction("evt-1", {
      ...validData,
      title: "",
      description: "",
      isDraft: false,
    });

    expect(result).toHaveProperty("fieldErrors.title");
    expect(result).toHaveProperty("fieldErrors.description");
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });
});

describe("saveEventAction", () => {
  const existing = {
    churchId: "ch-1",
    datetime: new Date("2026-05-01T09:00:00Z"),
    isDraft: true,
  };

  it("saves the full Event and invalidates its caches", async () => {
    mockEventFindUnique.mockResolvedValue(existing);
    mockEventUpdate.mockResolvedValue({});
    const datetimeISO = "2026-06-01T10:00:00.000Z";

    const result = await saveEventAction("evt-1", {
      ...validData,
      datetimeISO,
      isDraft: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Sunday Worship",
          datetime: new Date(datetimeISO),
          isDraft: false,
        }),
      })
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("events-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("church-ch-1");
  });

  it("returns fieldErrors for an incomplete Event", async () => {
    const result = await saveEventAction("evt-1", { ...validData, title: "" });

    expect(result).toHaveProperty("fieldErrors.title");
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("refuses a user without update on the Event", async () => {
    signInAs({ canResult: false });
    mockEventFindUnique.mockResolvedValue(existing);

    expect(await saveEventAction("evt-1", validData)).toEqual({
      error: "Unauthorised.",
    });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("refuses a guest", async () => {
    signOut();

    expect(await saveEventAction("evt-1", validData)).toEqual({
      error: "Unauthorised.",
    });
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });
});

describe("cancelEventAction", () => {
  it("updates the event with cancelledAt and reason, then redirects to event page", async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    mockEventUpdate.mockResolvedValue({});

    await cancelEventAction("evt-1", "Venue unavailable");

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "evt-1" }),
      data: expect.objectContaining({
        cancellationReason: "Venue unavailable",
      }),
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
    expect(mockRedirect).toHaveBeenCalledWith("/events/evt-1");
  });

  it("redirects away when the user is not an organiser", async () => {
    signOut();
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(cancelEventAction("evt-1", "reason")).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockEventUpdate).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects away when the user cannot manage the church", async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    signInAs({ canResult: false });
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(cancelEventAction("evt-1", "reason")).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockEventUpdate).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });

  it("redirects to /organiser when the event is not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(cancelEventAction("evt-missing", "reason")).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockEventUpdate).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });

  it("sends push notification to attendees on cancel", async () => {
    mockEventFindUnique.mockResolvedValue({
      churchId: "ch-1",
      title: "Test Event",
    });
    mockEventUpdate.mockResolvedValue({});
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: "user-2" }]);

    await cancelEventAction("evt-1", "Venue unavailable");

    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: NotificationType.EVENT_CANCELLED,
        title: "Event Cancelled",
        body: expect.stringContaining("Test Event"),
        data: expect.objectContaining({
          type: "event_cancelled",
          eventId: "evt-1",
        }),
        dedupeKey: "cancelled:evt-1",
      })
    );
  });

  it("handles EVENT_CANCELLED push failure gracefully", async () => {
    mockEventFindUnique.mockResolvedValue({
      churchId: "ch-1",
      title: "Test Event",
    });
    mockEventUpdate.mockResolvedValue({});
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: "user-2" }]);
    mockQueueNotification.mockRejectedValueOnce(new Error("push failed"));

    await cancelEventAction("evt-1", "reason");

    expect(mockRedirect).toHaveBeenCalledWith("/events/evt-1");
  });
});

describe("uncancelEventAction", () => {
  it("clears cancelledAt and cancellationReason, then redirects to event page", async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    mockEventUpdate.mockResolvedValue({});

    await uncancelEventAction("evt-1");

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "evt-1" }),
      data: { cancelledAt: null, cancellationReason: null },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
    expect(mockRedirect).toHaveBeenCalledWith("/events/evt-1");
  });

  it("redirects away when the user is not an organiser", async () => {
    signOut();
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(uncancelEventAction("evt-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockEventUpdate).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

describe("attendEventAction", () => {
  it("calls attendEvent DAL and invalidates event cache tags", async () => {
    await attendEventAction("evt-1");

    expect(mockAttendEvent).toHaveBeenCalledWith("evt-1", "user-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("returns an error from the DAL when the event is not found or a draft", async () => {
    mockAttendEvent.mockResolvedValue({ error: "Event not found." });

    const result = await attendEventAction("evt-1");

    expect(result.error).toBeDefined();
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await attendEventAction("evt-1");

    expect(result.error).toBeDefined();
    expect(mockAttendEvent).not.toHaveBeenCalled();
  });
});

describe("unattendEventAction", () => {
  it("calls unattendEvent DAL and invalidates event cache tags", async () => {
    await unattendEventAction("evt-1");

    expect(mockUnattendEvent).toHaveBeenCalledWith("evt-1", "user-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await unattendEventAction("evt-1");

    expect(result.error).toBeDefined();
    expect(mockUnattendEvent).not.toHaveBeenCalled();
  });
});

describe("registerEventAction", () => {
  it("calls registerEvent DAL with phone and notes, returns success", async () => {
    const result = await registerEventAction("evt-1", {
      phone: "07700000000",
      notes: "Vegetarian",
    });

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      "user-1",
      expect.objectContaining({ phone: "07700000000", notes: "Vegetarian" })
    );
    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("calls registerEvent DAL with no optional fields when form is empty", async () => {
    const result = await registerEventAction("evt-1", {});

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      "user-1",
      expect.objectContaining({ phone: undefined, notes: undefined })
    );
    expect(result.success).toBe(true);
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBeDefined();
    expect(mockRegisterEvent).not.toHaveBeenCalled();
  });

  it("returns a DAL error when the event is a draft or does not exist", async () => {
    mockRegisterEvent.mockResolvedValue({ error: "Event not found." });

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBeDefined();
  });

  it("returns a fully booked error from the DAL", async () => {
    mockRegisterEvent.mockResolvedValue({
      error: "Sorry, this event is fully booked.",
    });

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBe("Sorry, this event is fully booked.");
  });

  it("passes mapped responses to registerEvent", async () => {
    await registerEventAction("evt-1", {
      responses: {
        q1: { answer: "yes", fileUrl: null },
        q2: { answer: null, fileUrl: "https://example.com/file.pdf" },
      },
    });
    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      expect.any(String), // userId
      expect.objectContaining({
        responses: expect.arrayContaining([
          { questionId: "q1", answer: "yes", fileUrl: null },
          {
            questionId: "q2",
            answer: null,
            fileUrl: "https://example.com/file.pdf",
          },
        ]),
      })
    );
  });
});

describe("deleteEventAction", () => {
  it("cancels reminders, deletes the event, and redirects to /organiser", async () => {
    const mockCancelAll = jest.requireMock("@/domains/notifications/queue")
      .cancelManyNotifications as jest.Mock;
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    mockEventDelete.mockResolvedValue({});

    await deleteEventAction("evt-1");

    expect(mockCancelAll).toHaveBeenCalledWith({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: "evt-1",
    });
    expect(mockEventDelete).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "evt-1" }),
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("events-list");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });

  it("redirects away when the user is not an organiser", async () => {
    signOut();
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteEventAction("evt-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockEventDelete).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when the event is not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteEventAction("evt-missing")).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockEventDelete).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });

  it("redirects away when the organiser cannot manage the church", async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    signInAs({ canResult: false });
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteEventAction("evt-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockEventDelete).not.toHaveBeenCalled();
  });

  it("handles cancelManyNotifications failure gracefully", async () => {
    const mockCancelAll = jest.requireMock("@/domains/notifications/queue")
      .cancelManyNotifications as jest.Mock;
    mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
    mockEventDelete.mockResolvedValue({});
    mockCancelAll.mockRejectedValueOnce(new Error("scheduler down"));

    await deleteEventAction("evt-1");

    expect(mockEventDelete).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "evt-1" }),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });
});
