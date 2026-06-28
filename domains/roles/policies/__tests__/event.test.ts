jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { eventPolicy } from "../event";
import { createActor } from "../../lib/actor";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const manager = createActor("u1", false);
const admin = createActor("u2", true);

beforeEach(() => jest.clearAllMocks());

describe("eventPolicy", () => {
  describe("canCreate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(true);
    });
    it("true for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(true);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await eventPolicy.canCreate(manager, "c1")).toBe(false);
    });
    it("true for platform admin (no DB call)", async () => {
      expect(await eventPolicy.canCreate(admin, "any")).toBe(true);
      expect(mockChurch).not.toHaveBeenCalled();
    });
  });

  describe("canPublish", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canPublish(manager, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canPublish(manager, "c1")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await eventPolicy.canDelete(manager, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await eventPolicy.canDelete(manager, "c1")).toBe(false);
    });
  });
});
