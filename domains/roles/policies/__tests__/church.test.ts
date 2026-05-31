jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { churchPolicy } from "../church";
import type { Actor } from "../../lib/can";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const user: Actor = { id: "u1", isPlatformAdmin: false };

beforeEach(() => jest.clearAllMocks());

describe("churchPolicy", () => {
  describe("canManageMembers", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(true);
    });
    it("false for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(false);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await churchPolicy.canManageMembers(user, "c1")).toBe(false);
    });
  });

  describe("canManage", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await churchPolicy.canManage(user, "c1")).toBe(true);
    });
    it("false for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await churchPolicy.canManage(user, "c1")).toBe(false);
    });
  });
});
