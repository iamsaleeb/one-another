jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
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
  getMyRequestForResource,
  getPendingRequestsForResource,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
} from "../requests";
import { prisma } from "@/lib/db";

const mockApprovalRequest = prisma.approvalRequest as jest.Mocked<typeof prisma.approvalRequest>;
const mockEvent = prisma.event as jest.Mocked<typeof prisma.event>;
const mockSeries = prisma.series as jest.Mocked<typeof prisma.series>;
const mockEventStaff = prisma.eventStaffAssignment as jest.Mocked<typeof prisma.eventStaffAssignment>;
const mockChurchMembership = prisma.churchMembership as jest.Mocked<typeof prisma.churchMembership>;

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
    mockChurchMembership.findMany.mockResolvedValue([{ userId: "mgr1" }, { userId: "admin1" }] as never);
    const ids = await getApproverIdsForResource("EVENT", "e1");
    expect(ids).toEqual(expect.arrayContaining(["mgr1", "admin1"]));
    expect(ids.length).toBe(2);
  });

  it("returns empty array when event not found", async () => {
    mockEvent.findUnique.mockResolvedValue(null);
    const ids = await getApproverIdsForResource("EVENT", "missing");
    expect(ids).toEqual([]);
  });
});

describe("resolveApprovalAuthContext", () => {
  it("returns eventId + churchId for EVENT", async () => {
    mockEvent.findUnique.mockResolvedValue({ churchId: "ch1" } as never);
    const ctx = await resolveApprovalAuthContext("EVENT", "e1");
    expect(ctx).toEqual({ eventId: "e1", churchId: "ch1" });
  });

  it("returns churchId only for CHURCH", async () => {
    const ctx = await resolveApprovalAuthContext("CHURCH", "ch1");
    expect(ctx).toEqual({ churchId: "ch1" });
  });
});

describe("hasDirectRoleForResource", () => {
  it("returns true when EventStaffAssignment exists", async () => {
    mockEventStaff.findUnique.mockResolvedValue({ role: "EVENT_EDITOR" } as never);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(true);
  });

  it("returns false when no assignment", async () => {
    mockEventStaff.findUnique.mockResolvedValue(null);
    const result = await hasDirectRoleForResource("u1", "EVENT", "e1");
    expect(result).toBe(false);
  });
});
