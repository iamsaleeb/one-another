jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    event: { findUnique: jest.fn() },
    series: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn(), findMany: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn(), findMany: jest.fn() },
    churchMembership: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));

import {
  upsertApprovalRequest,
  updateApprovalRequest,
  getApprovalRequestById,
  getMyRequestForResource,
  getPendingRequestsForResource,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
  deleteApprovalRequest,
  getAllRequestsForResource,
} from "../requests";
import { prisma } from "@/lib/db";

const mockApprovalRequest = prisma.approvalRequest as jest.Mocked<
  typeof prisma.approvalRequest
>;
const mockEvent = prisma.event as jest.Mocked<typeof prisma.event>;
const mockSeries = prisma.series as jest.Mocked<typeof prisma.series>;
const mockEventStaff = prisma.eventStaffAssignment as jest.Mocked<
  typeof prisma.eventStaffAssignment
>;
const mockSeriesStaff = prisma.seriesStaffAssignment as jest.Mocked<
  typeof prisma.seriesStaffAssignment
>;
const mockChurchMembership = prisma.churchMembership as jest.Mocked<
  typeof prisma.churchMembership
>;

beforeEach(() => jest.clearAllMocks());

describe("upsertApprovalRequest", () => {
  it("upserts on composite unique", async () => {
    mockApprovalRequest.upsert.mockResolvedValue({} as never);
    await upsertApprovalRequest({
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "Hi",
    });
    expect(mockApprovalRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          requesterId_resourceType_resourceId: {
            requesterId: "u1",
            resourceType: "EVENT",
            resourceId: "e1",
          },
        },
      })
    );
  });
});

describe("updateApprovalRequest", () => {
  it("updates by id with provided data", async () => {
    const data = {
      status: "APPROVED" as const,
      reviewedBy: "reviewer-1",
      reviewedAt: new Date("2025-01-01"),
    };
    mockApprovalRequest.update.mockResolvedValue({} as never);
    await updateApprovalRequest("req-1", data);
    expect(mockApprovalRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data,
    });
  });
});

describe("getApprovalRequestById", () => {
  it("finds by id and includes requester", async () => {
    const fakeRequest = {
      id: "req-1",
      requester: { id: "u1", name: "Alice" },
    };
    mockApprovalRequest.findUnique.mockResolvedValue(fakeRequest as never);
    const result = await getApprovalRequestById("req-1");
    expect(mockApprovalRequest.findUnique).toHaveBeenCalledWith({
      where: { id: "req-1" },
      include: { requester: { select: { id: true, name: true } } },
    });
    expect(result).toBe(fakeRequest);
  });

  it("returns null when not found", async () => {
    mockApprovalRequest.findUnique.mockResolvedValue(null);
    const result = await getApprovalRequestById("missing");
    expect(result).toBeNull();
  });
});

describe("deleteApprovalRequest", () => {
  it("deletes by id", async () => {
    mockApprovalRequest.delete.mockResolvedValue({} as never);
    await deleteApprovalRequest("req-1");
    expect(mockApprovalRequest.delete).toHaveBeenCalledWith({
      where: { id: "req-1" },
    });
  });
});

describe("getMyRequestForResource", () => {
  it("queries by composite unique", async () => {
    mockApprovalRequest.findUnique.mockResolvedValue(null);
    await getMyRequestForResource("u1", "EVENT", "e1");
    expect(mockApprovalRequest.findUnique).toHaveBeenCalledWith({
      where: {
        requesterId_resourceType_resourceId: {
          requesterId: "u1",
          resourceType: "EVENT",
          resourceId: "e1",
        },
      },
    });
  });
});

describe("getPendingRequestsForResource", () => {
  it("filters by PENDING status", async () => {
    mockApprovalRequest.findMany.mockResolvedValue([]);
    await getPendingRequestsForResource("EVENT", "e1");
    expect(mockApprovalRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resourceType: "EVENT", resourceId: "e1", status: "PENDING" },
      })
    );
  });
});

describe("getApproverIdsForResource", () => {
  it("returns deduped ids for EVENT type", async () => {
    mockEvent.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    mockEventStaff.findMany.mockResolvedValue([{ userId: "mgr1" }] as never);
    mockChurchMembership.findMany.mockResolvedValue([
      { userId: "mgr1" },
      { userId: "admin1" },
    ] as never);
    const ids = await getApproverIdsForResource("EVENT", "e1");
    expect(ids).toEqual(expect.arrayContaining(["mgr1", "admin1"]));
    expect(ids.length).toBe(2);
  });

  it("returns empty array when event not found", async () => {
    mockEvent.findUnique.mockResolvedValue(null);
    const ids = await getApproverIdsForResource("EVENT", "missing");
    expect(ids).toEqual([]);
  });

  it("returns deduped ids for SERIES type", async () => {
    mockSeries.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    mockSeriesStaff.findMany.mockResolvedValue([
      { userId: "series-mgr1" },
    ] as never);
    mockChurchMembership.findMany.mockResolvedValue([
      { userId: "series-mgr1" },
      { userId: "church-admin1" },
    ] as never);
    const ids = await getApproverIdsForResource("SERIES", "s1");
    expect(ids).toEqual(
      expect.arrayContaining(["series-mgr1", "church-admin1"])
    );
    expect(ids.length).toBe(2);
  });

  it("returns empty array when series not found", async () => {
    mockSeries.findUnique.mockResolvedValue(null);
    const ids = await getApproverIdsForResource("SERIES", "missing");
    expect(ids).toEqual([]);
  });

  it("returns CHURCH_ADMIN ids for CHURCH type", async () => {
    mockChurchMembership.findMany.mockResolvedValue([
      { userId: "admin1" },
      { userId: "admin2" },
    ] as never);
    const ids = await getApproverIdsForResource("CHURCH", "ch1");
    expect(ids).toEqual(["admin1", "admin2"]);
    expect(mockChurchMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { churchId: "ch1", role: "CHURCH_ADMIN" },
      })
    );
  });
});

describe("resolveApprovalAuthContext", () => {
  it("returns eventId + churchId for EVENT", async () => {
    mockEvent.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    const ctx = await resolveApprovalAuthContext("EVENT", "e1");
    expect(ctx).toEqual({ eventId: "e1", churchId: "ch1" });
  });

  it("returns seriesId + churchId for SERIES", async () => {
    mockSeries.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    const ctx = await resolveApprovalAuthContext("SERIES", "s1");
    expect(ctx).toEqual({ seriesId: "s1", churchId: "ch1" });
  });

  it("returns churchId only for CHURCH", async () => {
    const ctx = await resolveApprovalAuthContext("CHURCH", "ch1");
    expect(ctx).toEqual({ churchId: "ch1" });
  });
});

describe("hasDirectRoleForResource", () => {
  it("returns true when EventStaffAssignment exists", async () => {
    mockEventStaff.findUnique.mockResolvedValue({
      role: "EVENT_EDITOR",
    } as never);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(true);
  });

  it("returns false when no event assignment", async () => {
    mockEventStaff.findUnique.mockResolvedValue(null);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(false);
  });

  it("returns true when SeriesStaffAssignment exists", async () => {
    mockSeriesStaff.findUnique.mockResolvedValue({
      role: "SERIES_SESSION_CREATOR",
    } as never);
    const result = await hasDirectRoleForResource("u1", "SERIES", "s1");
    expect(result).toBe(true);
  });

  it("returns false when no series assignment", async () => {
    mockSeriesStaff.findUnique.mockResolvedValue(null);
    const result = await hasDirectRoleForResource("u1", "SERIES", "s1");
    expect(result).toBe(false);
  });

  it("returns true when ChurchMembership exists", async () => {
    mockChurchMembership.findUnique.mockResolvedValue({
      role: "EVENT_CREATOR",
    } as never);
    const result = await hasDirectRoleForResource("u1", "CHURCH", "ch1");
    expect(result).toBe(true);
  });

  it("returns false when no church membership", async () => {
    mockChurchMembership.findUnique.mockResolvedValue(null);
    const result = await hasDirectRoleForResource("u1", "CHURCH", "ch1");
    expect(result).toBe(false);
  });
});

describe("getAllRequestsForResource", () => {
  it("queries non-PENDING requests ordered by updatedAt desc", async () => {
    mockApprovalRequest.findMany.mockResolvedValue([]);
    await getAllRequestsForResource("EVENT", "e1");
    expect(mockApprovalRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resourceType: "EVENT",
          resourceId: "e1",
          status: { not: "PENDING" },
        },
        orderBy: { updatedAt: "desc" },
      })
    );
  });
});
