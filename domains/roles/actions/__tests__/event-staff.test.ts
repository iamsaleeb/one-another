jest.mock("server-only", () => ({}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToClaims: jest.fn(),
}));
jest.mock("@/domains/roles/dal/event-staff", () => ({
  upsertEventStaff: jest.fn(),
  removeEventStaff: jest.fn(),
}));

import { assignEventRoleAction } from "../event-staff";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sessionToClaims } from "@/domains/roles/lib/session";
import {
  upsertEventStaff,
  removeEventStaff,
} from "@/domains/roles/dal/event-staff";

const mockAuth = auth as jest.Mock;
const mockEventFindUnique = prisma.event.findUnique as jest.Mock;
const mockStaffFindUnique =
  prisma.eventStaffAssignment.findUnique as jest.Mock;
const mockSessionToClaims = sessionToClaims as jest.Mock;
const mockUpsert = upsertEventStaff as jest.Mock;
const _mockRemove = removeEventStaff as jest.Mock;

const validSession = { user: { id: "admin-1" } };
const churchManagerClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_MANAGER" as const }],
};
const noClaims = { isPlatformAdmin: false, churchMemberships: [] };

describe("assignEventRoleAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToClaims.mockReturnValue(null);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when event not found", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    mockEventFindUnique.mockResolvedValue(null);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ error: "Event not found." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when no church access and no event staff role", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(noClaims);
    mockEventFindUnique.mockResolvedValue({ churchId: "c1" });
    mockStaffFindUnique.mockResolvedValue(null);
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when caller is EVENT_EDITOR (not manager)", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(noClaims);
    mockEventFindUnique.mockResolvedValue({ churchId: "c1" });
    mockStaffFindUnique.mockResolvedValue({ role: "EVENT_EDITOR" });
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns role when caller has church-level EVENT_MANAGER", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    mockEventFindUnique.mockResolvedValue({ churchId: "c1" });
    mockUpsert.mockResolvedValue({});
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ success: "Staff role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith("u1", "e1", "EVENT_EDITOR", "admin-1");
    expect(mockStaffFindUnique).not.toHaveBeenCalled();
  });

  it("assigns role when caller is event-level EVENT_MANAGER staff", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(noClaims);
    mockEventFindUnique.mockResolvedValue({ churchId: "c1" });
    mockStaffFindUnique.mockResolvedValue({ role: "EVENT_MANAGER" });
    mockUpsert.mockResolvedValue({});
    const result = await assignEventRoleAction({
      userId: "u1",
      eventId: "e1",
      role: "EVENT_EDITOR",
    });
    expect(result).toEqual({ success: "Staff role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith("u1", "e1", "EVENT_EDITOR", "admin-1");
  });
});
