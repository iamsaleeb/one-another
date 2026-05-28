jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    platformRoleAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import {
  getPlatformRole,
  getPlatformAdmins,
  upsertPlatformRole,
  removePlatformRole,
} from "../platform-roles";
import { prisma } from "@/lib/db";

const mockFindFirst = prisma.platformRoleAssignment.findFirst as jest.Mock;
const mockFindMany = prisma.platformRoleAssignment.findMany as jest.Mock;
const mockUpsert = prisma.platformRoleAssignment.upsert as jest.Mock;
const mockDelete = prisma.platformRoleAssignment.delete as jest.Mock;

describe("platform-roles DAL", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getPlatformRole", () => {
    it("queries by userId", async () => {
      mockFindFirst.mockResolvedValue(null);
      await getPlatformRole("u1");
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { userId: "u1" } });
    });
  });

  describe("getPlatformAdmins", () => {
    it("fetches all with user include", async () => {
      mockFindMany.mockResolvedValue([]);
      await getPlatformAdmins();
      expect(mockFindMany).toHaveBeenCalledWith({
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });
  });

  describe("upsertPlatformRole", () => {
    it("upserts PLATFORM_ADMIN", async () => {
      mockUpsert.mockResolvedValue({});
      await upsertPlatformRole("u1", "PLATFORM_ADMIN", "assigner-1");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId_role: { userId: "u1", role: "PLATFORM_ADMIN" } },
        update: { assignedBy: "assigner-1" },
        create: {
          userId: "u1",
          role: "PLATFORM_ADMIN",
          assignedBy: "assigner-1",
        },
      });
    });
  });

  describe("removePlatformRole", () => {
    it("deletes by composite key", async () => {
      mockDelete.mockResolvedValue({});
      await removePlatformRole("u1", "PLATFORM_ADMIN");
      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId_role: { userId: "u1", role: "PLATFORM_ADMIN" } },
      });
    });
  });
});
