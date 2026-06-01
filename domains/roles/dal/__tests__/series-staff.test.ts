jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    seriesStaffAssignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import {
  getSeriesStaff,
  getSeriesStaffForUser,
  upsertSeriesStaff,
  removeSeriesStaff,
} from "../series-staff";
import { prisma } from "@/lib/db";

const mockFindUnique = prisma.seriesStaffAssignment.findUnique as jest.Mock;
const mockFindMany = prisma.seriesStaffAssignment.findMany as jest.Mock;
const mockUpsert = prisma.seriesStaffAssignment.upsert as jest.Mock;
const mockDelete = prisma.seriesStaffAssignment.delete as jest.Mock;

describe("series-staff DAL", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getSeriesStaff", () => {
    it("queries by seriesId with user include", async () => {
      mockFindMany.mockResolvedValue([]);
      await getSeriesStaff("s1");
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { seriesId: "s1" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });
  });

  describe("getSeriesStaffForUser", () => {
    it("queries by composite key", async () => {
      mockFindUnique.mockResolvedValue(null);
      await getSeriesStaffForUser("u1", "s1");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId_seriesId: { userId: "u1", seriesId: "s1" } },
      });
    });
  });

  describe("upsertSeriesStaff", () => {
    it("upserts with correct data", async () => {
      mockUpsert.mockResolvedValue({});
      await upsertSeriesStaff("u1", "s1", "SERIES_MANAGER", "assigner-1");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId_seriesId: { userId: "u1", seriesId: "s1" } },
        update: { role: "SERIES_MANAGER", assignedBy: "assigner-1" },
        create: {
          userId: "u1",
          seriesId: "s1",
          role: "SERIES_MANAGER",
          assignedBy: "assigner-1",
        },
      });
    });
  });

  describe("removeSeriesStaff", () => {
    it("deletes by composite key", async () => {
      mockDelete.mockResolvedValue({});
      await removeSeriesStaff("u1", "s1");
      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId_seriesId: { userId: "u1", seriesId: "s1" } },
      });
    });
  });
});
