jest.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  queueNotification,
  cancelManyNotifications,
} from "@/domains/notifications/queue";

const mockUpsert = prisma.notification.upsert as jest.Mock;
const mockCreate = prisma.notification.create as jest.Mock;
const mockUpdateMany = prisma.notification.updateMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("queueNotification — deduped (EVENT_REMINDER)", () => {
  it("upserts with dedupeKey and future scheduledFor", async () => {
    const future = new Date(Date.now() + 3_600_000);
    mockUpsert.mockResolvedValue({ id: "n-1" });

    await queueNotification({
      userId: "u-1",
      type: NotificationType.EVENT_REMINDER,
      title: "Reminder",
      body: "Event starts soon",
      data: { type: "EVENT_REMINDER", eventId: "ev-1" },
      scheduledFor: future,
      dedupeKey: "ev-1",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_dedupeKey: {
            userId: "u-1",
            type: NotificationType.EVENT_REMINDER,
            dedupeKey: "ev-1",
          },
        },
        create: expect.objectContaining({
          userId: "u-1",
          dedupeKey: "ev-1",
          scheduledFor: future,
        }),
        update: expect.objectContaining({
          scheduledFor: future,
          cancelledAt: null,
        }),
      })
    );
  });
});

describe("queueNotification — instant (EVENT_CANCELLED, NEW_SERIES_SESSION)", () => {
  it("creates a new record with dedupeKey=null and scheduledFor≈now", async () => {
    mockCreate.mockResolvedValue({ id: "n-2" });

    await queueNotification({
      userId: "u-2",
      type: NotificationType.EVENT_CANCELLED,
      title: "Cancelled",
      body: "Your event was cancelled",
      data: { type: "EVENT_CANCELLED", eventId: "ev-2" },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-2",
          type: NotificationType.EVENT_CANCELLED,
          dedupeKey: undefined,
        }),
      })
    );
  });
});

describe("cancelManyNotifications", () => {
  it("cancels all unsent records for a type+dedupeKey across users", async () => {
    mockUpdateMany.mockResolvedValue({ count: 5 });

    await cancelManyNotifications({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: "ev-1",
    });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        type: NotificationType.EVENT_REMINDER,
        dedupeKey: "ev-1",
        sentAt: null,
        cancelledAt: null,
      },
      data: { cancelledAt: expect.any(Date) },
    });
  });
});
