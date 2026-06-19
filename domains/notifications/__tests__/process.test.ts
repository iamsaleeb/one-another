jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

jest.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationPreference: {
      findMany: jest.fn(),
    },
    pushToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdmin: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { processNotifications } from "@/domains/notifications/process";

const mockNotificationFindMany = prisma.notification.findMany as jest.Mock;
const mockNotificationUpdateMany = prisma.notification.updateMany as jest.Mock;
const mockPrefFindMany = prisma.notificationPreference.findMany as jest.Mock;
const mockTokenFindMany = prisma.pushToken.findMany as jest.Mock;
const mockTokenDeleteMany = prisma.pushToken.deleteMany as jest.Mock;
const mockGetFirebaseAdmin = getFirebaseAdmin as jest.Mock;
const mockSendEachForMulticast = jest.fn();

const makeNotif = (overrides: Record<string, unknown> = {}) => ({
  id: "n-1",
  userId: "u-1",
  type: "EVENT_REMINDER",
  title: "Event soon",
  body: "In 1 hour",
  data: { type: "EVENT_REMINDER", eventId: "ev-1" },
  scheduledFor: new Date(Date.now() - 1000),
  sentAt: null,
  cancelledAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefFindMany.mockResolvedValue([]);
  mockTokenFindMany.mockResolvedValue([]);
  mockNotificationUpdateMany.mockResolvedValue({});
  mockTokenDeleteMany.mockResolvedValue({});
  mockGetFirebaseAdmin.mockReturnValue({
    messaging: { sendEachForMulticast: mockSendEachForMulticast },
  });
  mockSendEachForMulticast.mockResolvedValue({ responses: [] });
});

describe("processNotifications", () => {
  it("returns 0 when no due notifications", async () => {
    mockNotificationFindMany.mockResolvedValue([]);
    expect(await processNotifications()).toEqual({ processed: 0 });
    expect(mockPrefFindMany).not.toHaveBeenCalled();
  });

  it("batch-queries opt-outs and tokens for all userIds at once", async () => {
    mockNotificationFindMany.mockResolvedValue([
      makeNotif({ id: "n-1", userId: "u-1" }),
      makeNotif({ id: "n-2", userId: "u-2", type: "EVENT_CANCELLED" }),
    ]);

    await processNotifications();

    expect(mockPrefFindMany).toHaveBeenCalledTimes(1);
    expect(mockPrefFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { in: expect.arrayContaining(["u-1", "u-2"]) },
          enabled: false,
        },
      })
    );
    expect(mockTokenFindMany).toHaveBeenCalledTimes(1);
  });

  it("marks opted-out notifications as sent without pushing", async () => {
    mockNotificationFindMany.mockResolvedValue([makeNotif()]);
    mockPrefFindMany.mockResolvedValue([
      { userId: "u-1", type: "EVENT_REMINDER" },
    ]);

    const result = await processNotifications();

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["n-1"] } },
      data: { sentAt: expect.any(Date) },
    });
    expect(result).toEqual({ processed: 1 });
  });

  it("marks no-token notifications as sent without pushing", async () => {
    mockNotificationFindMany.mockResolvedValue([makeNotif()]);
    mockTokenFindMany.mockResolvedValue([]);

    const result = await processNotifications();

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["n-1"] } } })
    );
    expect(result).toEqual({ processed: 1 });
  });

  it("sends FCM and batch-marks sentAt for successful notifications", async () => {
    mockNotificationFindMany.mockResolvedValue([
      makeNotif({ id: "n-1", userId: "u-1" }),
      makeNotif({
        id: "n-2",
        userId: "u-2",
        type: "EVENT_CANCELLED",
        title: "Gone",
        body: "Cancelled",
      }),
    ]);
    mockTokenFindMany.mockResolvedValue([
      { userId: "u-1", token: "tok-1" },
      { userId: "u-2", token: "tok-2" },
    ]);
    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }],
    });

    const result = await processNotifications();

    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["n-1", "n-2"] } },
      data: { sentAt: expect.any(Date) },
    });
    expect(result).toEqual({ processed: 2 });
  });

  it("excludes failed FCM sends from processed count and sentAt batch", async () => {
    mockNotificationFindMany.mockResolvedValue([makeNotif()]);
    mockTokenFindMany.mockResolvedValue([{ userId: "u-1", token: "tok-1" }]);
    mockSendEachForMulticast.mockRejectedValueOnce(new Error("FCM down"));

    const result = await processNotifications();

    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0 });
  });

  it("cleans stale tokens detected during FCM send", async () => {
    mockNotificationFindMany.mockResolvedValue([makeNotif()]);
    mockTokenFindMany.mockResolvedValue([
      { userId: "u-1", token: "tok-stale" },
    ]);
    mockSendEachForMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });

    await processNotifications();

    expect(mockTokenDeleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["tok-stale"] } },
    });
  });

  it("skips updateMany when nothing was processed", async () => {
    mockNotificationFindMany.mockResolvedValue([makeNotif()]);
    mockTokenFindMany.mockResolvedValue([{ userId: "u-1", token: "tok-1" }]);
    mockSendEachForMulticast.mockRejectedValueOnce(new Error("err"));

    await processNotifications();

    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });
});
