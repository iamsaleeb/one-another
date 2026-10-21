jest.mock("server-only", () => ({}));
jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));
jest.mock("@/domains/roles/dal/platform-roles", () => ({
  upsertPlatformRole: jest.fn(),
  removePlatformRole: jest.fn(),
}));

import {
  assignPlatformRoleAction,
  removePlatformRoleAction,
} from "../platform-roles";
import { getActor } from "@/domains/roles/lib/session";
import {
  upsertPlatformRole,
  removePlatformRole,
} from "@/domains/roles/dal/platform-roles";

const mockGetActor = getActor as jest.Mock;
const mockUpsert = upsertPlatformRole as jest.Mock;
const mockRemove = removePlatformRole as jest.Mock;

function makeActor(opts: { id?: string; isPlatformAdmin?: boolean } = {}) {
  return {
    isAuthenticated: true as const,
    id: opts.id ?? "admin-1",
    isPlatformAdmin: opts.isPlatformAdmin ?? true,
    can: jest.fn().mockResolvedValue(true),
    loadContext: jest.fn(),
  };
}

const guestActor = {
  isAuthenticated: false as const,
  can: jest.fn().mockResolvedValue(false),
  loadContext: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(makeActor());
});

describe("assignPlatformRoleAction", () => {
  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when caller is not platform admin", async () => {
    mockGetActor.mockResolvedValue(makeActor({ isPlatformAdmin: false }));
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns platform role when caller is platform admin", async () => {
    mockGetActor.mockResolvedValue(makeActor({ id: "admin-1" }));
    mockUpsert.mockResolvedValue({});
    const result = await assignPlatformRoleAction({
      userId: "u1",
      role: "PLATFORM_ADMIN",
    });
    expect(result).toEqual({ success: "Platform role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith("u1", "PLATFORM_ADMIN", "admin-1");
  });
});

describe("removePlatformRoleAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await removePlatformRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    const result = await removePlatformRoleAction({ userId: "u1" });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when caller is not platform admin", async () => {
    mockGetActor.mockResolvedValue(makeActor({ isPlatformAdmin: false }));
    const result = await removePlatformRoleAction({ userId: "u1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes platform role when caller is platform admin", async () => {
    mockRemove.mockResolvedValue({});
    const result = await removePlatformRoleAction({ userId: "u1" });
    expect(result).toEqual({ success: "Platform role removed." });
    expect(mockRemove).toHaveBeenCalledWith("u1", "PLATFORM_ADMIN");
  });
});
