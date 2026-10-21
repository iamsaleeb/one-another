jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));
jest.mock("@/domains/roles/dal/event-staff", () => ({
  upsertEventStaff: jest.fn(),
  removeEventStaff: jest.fn(),
}));

import { assignEventRoleAction, removeEventStaffAction } from "../event-staff";
import { prisma } from "@/lib/db";
import {
  upsertEventStaff,
  removeEventStaff,
} from "@/domains/roles/dal/event-staff";
import { grants, signInAs } from "@/domains/roles/testing";

const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockUpsert = upsertEventStaff as jest.Mock;
const mockRemove = removeEventStaff as jest.Mock;

const eventManagerOfE1 = grants({
  event: [{ eventId: "e1", role: "EVENT_MANAGER" }],
});

beforeEach(() => {
  jest.clearAllMocks();
  signInAs("admin-1", eventManagerOfE1);
  mockEventFindUnique.mockResolvedValue({
    id: "e1",
    churchId: "ch-1",
    seriesId: null,
  });
});

describe("assignEventRoleAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await assignEventRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated", async () => {
    signInAs(null);
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

  it("returns error for an Event editor (no manage_staff)", async () => {
    signInAs(
      "editor-1",
      grants({ event: [{ eventId: "e1", role: "EVENT_EDITOR" }] })
    );
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns role for an Event manager", async () => {
    mockUpsert.mockResolvedValue({});
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ success: "Staff role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith(
      "u1",
      "e1",
      "EVENT_MANAGER",
      "admin-1"
    );
  });

  it("assigns role for a Church manager via the role cascade", async () => {
    signInAs(
      "cm-1",
      grants({ church: [{ churchId: "ch-1", role: "EVENT_MANAGER" }] })
    );
    mockUpsert.mockResolvedValue({});
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ success: "Staff role assigned." });
  });
});

describe("removeEventStaffAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await removeEventStaffAction({});
    expect(result).toHaveProperty("fieldErrors");
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated", async () => {
    signInAs(null);
    const result = await removeEventStaffAction({
      userId: "u1",
      eventId: "e1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when event not found", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    const result = await removeEventStaffAction({
      userId: "u1",
      eventId: "e1",
    });
    expect(result).toEqual({ error: "Event not found." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    signInAs("u9", grants());
    const result = await removeEventStaffAction({
      userId: "u1",
      eventId: "e1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes staff when authorized", async () => {
    mockRemove.mockResolvedValue({});
    const result = await removeEventStaffAction({
      userId: "u1",
      eventId: "e1",
    });
    expect(result).toEqual({ success: "Staff removed." });
    expect(mockRemove).toHaveBeenCalledWith("u1", "e1");
  });
});
