jest.mock("@/lib/db", () => ({
  prisma: {
    approvalRequest: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import * as db from "@/lib/db";
import {
  upsertApprovalRequest,
  getMyRequestForResource,
  getPendingRequestsForResource,
  getResolvedRequestsForResource,
  getApprovalRequestById,
  updateApprovalRequest,
  updateApprovalRequestIfPending,
} from "../requests";

const mock = db.prisma.approvalRequest as jest.Mocked<
  typeof db.prisma.approvalRequest
>;

beforeEach(() => jest.clearAllMocks());

describe("upsertApprovalRequest", () => {
  it("upserts with correct where/create/update", async () => {
    mock.upsert.mockResolvedValue({} as never);
    await upsertApprovalRequest({
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "hello",
    });
    expect(mock.upsert).toHaveBeenCalledWith({
      where: {
        requesterId_resourceType_resourceId: {
          requesterId: "u1",
          resourceType: "EVENT",
          resourceId: "e1",
        },
      },
      create: {
        requesterId: "u1",
        resourceType: "EVENT",
        resourceId: "e1",
        requestedRole: "EVENT_EDITOR",
        message: "hello",
        status: "PENDING",
      },
      update: {
        status: "PENDING",
        message: "hello",
        requestedRole: "EVENT_EDITOR",
        reviewedBy: null,
        reviewedAt: null,
      },
    });
  });
});

describe("getMyRequestForResource", () => {
  it("queries by requesterId + resourceType + resourceId", async () => {
    mock.findUnique.mockResolvedValue(null);
    await getMyRequestForResource("SERIES", "s1", "u1");
    expect(mock.findUnique).toHaveBeenCalledWith({
      where: {
        requesterId_resourceType_resourceId: {
          requesterId: "u1",
          resourceType: "SERIES",
          resourceId: "s1",
        },
      },
    });
  });
});

describe("getPendingRequestsForResource", () => {
  it("queries PENDING status with requester image", async () => {
    mock.findMany.mockResolvedValue([]);
    await getPendingRequestsForResource("CHURCH", "c1");
    expect(mock.findMany).toHaveBeenCalledWith({
      where: { resourceType: "CHURCH", resourceId: "c1", status: "PENDING" },
      include: { requester: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("getResolvedRequestsForResource", () => {
  it("queries non-PENDING with requester image and reviewer name", async () => {
    mock.findMany.mockResolvedValue([]);
    await getResolvedRequestsForResource("EVENT", "e1");
    expect(mock.findMany).toHaveBeenCalledWith({
      where: {
        resourceType: "EVENT",
        resourceId: "e1",
        status: { not: "PENDING" },
      },
      include: {
        requester: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("getApprovalRequestById", () => {
  it("queries by id with requester image and reviewer", async () => {
    mock.findUnique.mockResolvedValue(null);
    await getApprovalRequestById("req-1");
    expect(mock.findUnique).toHaveBeenCalledWith({
      where: { id: "req-1" },
      include: {
        requester: { select: { id: true, name: true, image: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
  });
});

describe("updateApprovalRequest", () => {
  it("updates by id with provided data", async () => {
    mock.update.mockResolvedValue({} as never);
    await updateApprovalRequest("req-1", {
      status: "APPROVED",
      reviewedBy: "u2",
      reviewedAt: new Date("2026-01-01"),
    });
    expect(mock.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: {
        status: "APPROVED",
        reviewedBy: "u2",
        reviewedAt: expect.any(Date),
      },
    });
  });
});

describe("updateApprovalRequestIfPending", () => {
  it("updates only when status is PENDING and returns count", async () => {
    (mock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const count = await updateApprovalRequestIfPending("req-1", {
      status: "APPROVED",
      reviewedBy: "u2",
      reviewedAt: new Date("2026-01-01"),
    });
    expect(count).toBe(1);
    expect(mock.updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedBy: "u2",
        reviewedAt: expect.any(Date),
      },
    });
  });

  it("returns 0 when request is not PENDING", async () => {
    (mock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const count = await updateApprovalRequestIfPending("req-1", {
      status: "APPROVED",
      reviewedBy: "u2",
      reviewedAt: new Date("2026-01-01"),
    });
    expect(count).toBe(0);
  });
});
