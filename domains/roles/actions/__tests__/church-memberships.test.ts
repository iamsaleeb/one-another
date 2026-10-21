jest.mock("server-only", () => ({}));
jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));
jest.mock("@/domains/roles/policies/church", () => ({
  churchPolicy: { canManageMembers: jest.fn().mockResolvedValue(true) },
}));
jest.mock("@/domains/roles/dal/church-memberships", () => ({
  upsertChurchMembership: jest.fn(),
  removeChurchMembership: jest.fn(),
}));

import {
  assignChurchRoleAction,
  removeChurchMembershipAction,
} from "../church-memberships";
import { getActor } from "@/domains/roles/lib/session";
import { churchPolicy } from "@/domains/roles/policies/church";
import {
  upsertChurchMembership,
  removeChurchMembership,
} from "@/domains/roles/dal/church-memberships";

const mockGetActor = getActor as jest.Mock;
const mockCanManageMembers = churchPolicy.canManageMembers as jest.Mock;
const mockUpsert = upsertChurchMembership as jest.Mock;
const mockRemove = removeChurchMembership as jest.Mock;

const validActor = {
  isAuthenticated: true as const,
  id: "admin-1",
  isPlatformAdmin: false,
  can: jest.fn().mockResolvedValue(true),
  loadContext: jest.fn(),
};

const guestActor = {
  isAuthenticated: false as const,
  can: jest.fn().mockResolvedValue(false),
  loadContext: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(validActor);
  mockCanManageMembers.mockResolvedValue(true);
});

describe("assignChurchRoleAction", () => {
  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c1",
      role: "CHURCH_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    mockCanManageMembers.mockResolvedValue(false);
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c1",
      role: "CHURCH_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns role and returns success when authorized", async () => {
    mockUpsert.mockResolvedValue({});
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c1",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ success: "Role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith(
      "u1",
      "c1",
      "EVENT_MANAGER",
      "admin-1"
    );
  });

  it("returns fieldErrors for invalid input", async () => {
    const result = await assignChurchRoleAction({
      userId: "",
      churchId: "c1",
      role: "INVALID",
    });
    expect(result).toHaveProperty("fieldErrors");
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("removeChurchMembershipAction", () => {
  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    const result = await removeChurchMembershipAction({
      userId: "u1",
      churchId: "c1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("removes membership when authorized", async () => {
    mockRemove.mockResolvedValue({});
    const result = await removeChurchMembershipAction({
      userId: "u1",
      churchId: "c1",
    });
    expect(result).toEqual({ success: "Membership removed." });
    expect(mockRemove).toHaveBeenCalledWith("u1", "c1");
  });
});
