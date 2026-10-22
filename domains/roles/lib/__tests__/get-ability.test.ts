jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    platformRoleAssignment: { findFirst: jest.fn() },
    churchMembership: { findMany: jest.fn() },
    seriesStaffAssignment: { findMany: jest.fn() },
    eventStaffAssignment: { findMany: jest.fn() },
  },
}));

import { subject } from "@casl/ability";
import type { Event } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAbility, getSessionUserId } from "../get-ability";
import { systemAbility } from "../system-ability";

const mockAuth = auth as unknown as jest.Mock;
const mockPlatform = prisma.platformRoleAssignment.findFirst as jest.Mock;
const mockChurch = prisma.churchMembership.findMany as jest.Mock;
const mockSeries = prisma.seriesStaffAssignment.findMany as jest.Mock;
const mockEvent = prisma.eventStaffAssignment.findMany as jest.Mock;

const e1 = subject("Event", {
  id: "e1",
  churchId: "c1",
  seriesId: "s1",
} as Event);

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.mockResolvedValue(null);
  mockChurch.mockResolvedValue([]);
  mockSeries.mockResolvedValue([]);
  mockEvent.mockResolvedValue([]);
});

describe("getAbility", () => {
  it("guest: no session → empty Ability, no DB queries", async () => {
    mockAuth.mockResolvedValue(null);
    const ability = await getAbility();
    expect(ability.rules).toHaveLength(0);
    expect(mockChurch).not.toHaveBeenCalled();
  });

  it("loads all Grants for the session user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockSeries.mockResolvedValue([
      { seriesId: "s1", role: "SERIES_SESSION_CREATOR" },
    ]);
    const ability = await getAbility();
    for (const m of [mockChurch, mockSeries, mockEvent])
      expect(m).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" } })
      );
    expect(ability.can("create", e1)).toBe(true);
    expect(ability.can("update", e1)).toBe(false);
  });

  it("platform admin comes from the DB, not the session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", isPlatformAdmin: false } });
    mockPlatform.mockResolvedValue({ role: "PLATFORM_ADMIN" });
    const ability = await getAbility();
    expect(ability.can("manage", "all")).toBe(true);
  });

  it("ignores Grants claimed in the session token", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "u1",
        isPlatformAdmin: true,
        churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
      },
    });
    const ability = await getAbility();
    expect(ability.can("update", e1)).toBe(false);
    expect(ability.can("manage", "all")).toBe(false);
  });
});

describe("getSessionUserId", () => {
  it("returns null for guests and empty ids", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getSessionUserId()).toBeNull();
    mockAuth.mockResolvedValue({ user: { id: "" } });
    expect(await getSessionUserId()).toBeNull();
  });

  it("returns the session user id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect(await getSessionUserId()).toBe("u1");
  });
});

describe("systemAbility", () => {
  it("may do everything without a session", () => {
    expect(systemAbility().can("delete", e1)).toBe(true);
    expect(mockAuth).not.toHaveBeenCalled();
  });
});
