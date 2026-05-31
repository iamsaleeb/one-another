jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/domains/roles/dal/event-staff", () => ({
  upsertEventStaff: jest.fn(),
  removeEventStaff: jest.fn(),
}));

import { assignEventRoleAction, removeEventStaffAction } from "../event-staff";
import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import {
  upsertEventStaff,
  removeEventStaff,
} from "@/domains/roles/dal/event-staff";

const mockGetActor = getActor as jest.Mock;
const mockCan = can as jest.Mock;
const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockUpsert = upsertEventStaff as jest.Mock;
const mockRemove = removeEventStaff as jest.Mock;

const validActor = { id: "admin-1", isPlatformAdmin: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(validActor);
  mockCan.mockResolvedValue(true);
  mockEventFindUnique.mockResolvedValue({ churchId: "ch-1" });
});

describe("assignEventRoleAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await assignEventRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when event not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ error: "Event not found." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when can() returns false", async () => {
    mockCan.mockResolvedValue(false);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns role when authorized", async () => {
    mockUpsert.mockResolvedValue({});
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ success: "Staff role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith("u1", "e1", "EVENT_MANAGER", "admin-1");
    expect(mockCan).toHaveBeenCalledWith(
      validActor,
      "event:manage_staff",
      { churchId: "ch-1", eventId: "e1" }
    );
  });
});

describe("removeEventStaffAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await removeEventStaffAction({});
    expect(result).toHaveProperty("fieldErrors");
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await removeEventStaffAction({ userId: "u1", eventId: "e1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when event not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    const result = await removeEventStaffAction({ userId: "u1", eventId: "e1" });
    expect(result).toEqual({ error: "Event not found." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when can() returns false", async () => {
    mockCan.mockResolvedValue(false);
    const result = await removeEventStaffAction({ userId: "u1", eventId: "e1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes staff when authorized", async () => {
    mockRemove.mockResolvedValue({});
    const result = await removeEventStaffAction({ userId: "u1", eventId: "e1" });
    expect(result).toEqual({ success: "Staff removed." });
    expect(mockRemove).toHaveBeenCalledWith("u1", "e1");
    expect(mockCan).toHaveBeenCalledWith(
      validActor,
      "event:manage_staff",
      { churchId: "ch-1", eventId: "e1" }
    );
  });
});
