jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    platformRoleAssignment: { findFirst: jest.fn() },
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { resolveCapabilities } from "../resolve-capabilities";
import { Capabilities } from "../capabilities";
import { prisma } from "@/lib/db";

const mockFindPlatform = prisma.platformRoleAssignment.findFirst as jest.Mock;
const mockFindChurch = prisma.churchMembership.findUnique as jest.Mock;
const mockFindEvent = prisma.eventStaffAssignment.findUnique as jest.Mock;

describe("resolveCapabilities", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("platform admin", () => {
    it("returns all capabilities when user has a platform role", async () => {
      mockFindPlatform.mockResolvedValue({
        userId: "u1",
        role: "PLATFORM_ADMIN",
      });
      const caps = await resolveCapabilities("u1", { scope: "PLATFORM" });
      expect(caps.has(Capabilities.CHURCH_MANAGE)).toBe(true);
      expect(caps.has(Capabilities.EVENT_CREATE)).toBe(true);
      expect(caps.has(Capabilities.PLATFORM_ADMIN)).toBe(true);
    });
  });

  describe("CHURCH scope", () => {
    it("returns church role capabilities for CHURCH_ADMIN", async () => {
      mockFindPlatform.mockResolvedValue(null);
      mockFindChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      const caps = await resolveCapabilities("u1", {
        scope: "CHURCH",
        churchId: "c1",
      });
      expect(caps.has(Capabilities.CHURCH_MANAGE)).toBe(true);
      expect(caps.has(Capabilities.EVENT_CREATE)).toBe(true);
      expect(mockFindChurch).toHaveBeenCalledWith({
        where: { userId_churchId: { userId: "u1", churchId: "c1" } },
      });
    });

    it("returns empty set when no church membership", async () => {
      mockFindPlatform.mockResolvedValue(null);
      mockFindChurch.mockResolvedValue(null);
      const caps = await resolveCapabilities("u1", {
        scope: "CHURCH",
        churchId: "c1",
      });
      expect(caps.size).toBe(0);
    });
  });

  describe("EVENT scope", () => {
    it("merges church membership and event staff capabilities", async () => {
      mockFindPlatform.mockResolvedValue(null);
      mockFindChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      mockFindEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
      const caps = await resolveCapabilities("u1", {
        scope: "EVENT",
        eventId: "e1",
        churchId: "c1",
      });
      expect(caps.has(Capabilities.EVENT_CREATE)).toBe(true); // from EVENT_CREATOR church role
      expect(caps.has(Capabilities.EVENT_SCAN_ATTENDEES)).toBe(true); // from EVENT_MANAGER event role
    });

    it("returns only event staff caps when no church membership", async () => {
      mockFindPlatform.mockResolvedValue(null);
      mockFindChurch.mockResolvedValue(null);
      mockFindEvent.mockResolvedValue({ role: "EVENT_EDITOR" });
      const caps = await resolveCapabilities("u1", {
        scope: "EVENT",
        eventId: "e1",
        churchId: "c1",
      });
      expect(caps.has(Capabilities.EVENT_UPDATE)).toBe(true);
      expect(caps.has(Capabilities.EVENT_CREATE)).toBe(false);
    });

    it("returns empty set when no memberships or staff assignments", async () => {
      mockFindPlatform.mockResolvedValue(null);
      mockFindChurch.mockResolvedValue(null);
      mockFindEvent.mockResolvedValue(null);
      const caps = await resolveCapabilities("u1", {
        scope: "EVENT",
        eventId: "e1",
        churchId: "c1",
      });
      expect(caps.size).toBe(0);
    });
  });
});
