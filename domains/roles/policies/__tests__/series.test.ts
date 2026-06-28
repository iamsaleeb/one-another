jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { seriesPolicy } from "../series";
import { createActor } from "../../lib/actor";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const user = createActor("u1", false);

beforeEach(() => jest.clearAllMocks());

describe("seriesPolicy", () => {
  describe("canCreate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(false);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await seriesPolicy.canCreate(user, "c1")).toBe(false);
    });
  });

  describe("canUpdate", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canUpdate(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canUpdate(user, "c1")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("true for CHURCH_ADMIN", async () => {
      mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
      expect(await seriesPolicy.canDelete(user, "c1")).toBe(true);
    });
    it("false for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canDelete(user, "c1")).toBe(false);
    });
  });

  describe("canAddSession", () => {
    it("true for EVENT_MANAGER", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(true);
    });
    it("true for EVENT_CREATOR", async () => {
      mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(true);
    });
    it("false with no membership", async () => {
      mockChurch.mockResolvedValue(null);
      expect(await seriesPolicy.canAddSession(user, "c1")).toBe(false);
    });
  });
});
