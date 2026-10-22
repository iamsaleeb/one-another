jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    eventStaffAssignment: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import {
  getEventStaffForUser,
  upsertEventStaff,
  removeEventStaff,
} from "../event-staff";
import { prisma } from "@/lib/db";

const mockFindUnique = prisma.eventStaffAssignment.findUnique as jest.Mock;
const mockUpsert = prisma.eventStaffAssignment.upsert as jest.Mock;
const mockDelete = prisma.eventStaffAssignment.delete as jest.Mock;

describe("event-staff DAL", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getEventStaffForUser", () => {
    it("queries by composite key", async () => {
      mockFindUnique.mockResolvedValue(null);
      await getEventStaffForUser("u1", "e1");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId_eventId: { userId: "u1", eventId: "e1" } },
      });
    });
  });

  describe("upsertEventStaff", () => {
    it("upserts with correct data", async () => {
      mockUpsert.mockResolvedValue({});
      await upsertEventStaff("u1", "e1", "EVENT_EDITOR", "assigner-1");
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId_eventId: { userId: "u1", eventId: "e1" } },
        update: { role: "EVENT_EDITOR", assignedBy: "assigner-1" },
        create: {
          userId: "u1",
          eventId: "e1",
          role: "EVENT_EDITOR",
          assignedBy: "assigner-1",
        },
      });
    });
  });

  describe("removeEventStaff", () => {
    it("deletes by composite key", async () => {
      mockDelete.mockResolvedValue({});
      await removeEventStaff("u1", "e1");
      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId_eventId: { userId: "u1", eventId: "e1" } },
      });
    });
  });
});
