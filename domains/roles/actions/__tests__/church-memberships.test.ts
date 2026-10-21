jest.mock("server-only", () => ({}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));
jest.mock("@/domains/roles/dal/church-memberships", () => ({
  upsertChurchMembership: jest.fn(),
  removeChurchMembership: jest.fn(),
}));

import {
  assignChurchRoleAction,
  removeChurchMembershipAction,
} from "../church-memberships";
import {
  upsertChurchMembership,
  removeChurchMembership,
} from "@/domains/roles/dal/church-memberships";
import { grants, signInAs } from "@/domains/roles/testing";

const mockUpsert = upsertChurchMembership as jest.Mock;
const mockRemove = removeChurchMembership as jest.Mock;

const churchAdminOfC1 = grants({
  church: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
});

beforeEach(() => {
  jest.clearAllMocks();
  signInAs("admin-1", churchAdminOfC1);
});

describe("assignChurchRoleAction", () => {
  it("returns error when unauthenticated", async () => {
    signInAs(null);
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c1",
      role: "CHURCH_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when the user cannot manage the Church's members", async () => {
    signInAs(
      "manager-1",
      grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
    );
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c1",
      role: "CHURCH_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error for a Church the admin does not run", async () => {
    const result = await assignChurchRoleAction({
      userId: "u1",
      churchId: "c2",
      role: "EVENT_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
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
    signInAs(null);
    const result = await removeChurchMembershipAction({
      userId: "u1",
      churchId: "c1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when the user cannot manage the Church's members", async () => {
    signInAs("u9", grants());
    const result = await removeChurchMembershipAction({
      userId: "u1",
      churchId: "c1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
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
