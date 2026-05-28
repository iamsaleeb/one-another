jest.mock("server-only", () => ({}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToClaims: jest.fn(),
}));
jest.mock("@/domains/roles/dal/platform-roles", () => ({
  upsertPlatformRole: jest.fn(),
  removePlatformRole: jest.fn(),
}));

import { assignPlatformRoleAction } from "../platform-roles";
import { auth } from "@/auth";
import { sessionToClaims } from "@/domains/roles/lib/session";
import {
  upsertPlatformRole,
  removePlatformRole,
} from "@/domains/roles/dal/platform-roles";

const mockAuth = auth as jest.Mock;
const mockSessionToClaims = sessionToClaims as jest.Mock;
const mockUpsert = upsertPlatformRole as jest.Mock;
const _mockRemove = removePlatformRole as jest.Mock;

describe("assignPlatformRoleAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToClaims.mockReturnValue(null);
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when caller is not platform admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2" } });
    mockSessionToClaims.mockReturnValue({
      isPlatformAdmin: false,
      churchMemberships: [],
    });
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns platform role when caller is platform admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mockSessionToClaims.mockReturnValue({
      isPlatformAdmin: true,
      churchMemberships: [],
    });
    mockUpsert.mockResolvedValue({});
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ success: "Platform role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith("u1", "PLATFORM_ADMIN", "admin-1");
  });
});
