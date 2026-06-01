jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/domains/roles/lib/session", () => ({ getActor: jest.fn() }));
jest.mock("@/domains/roles/lib/can", () => ({ can: jest.fn() }));
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  updateApprovalRequest: jest.fn(),
  getApprovalRequestById: jest.fn(),
  getApproverIdsForResource: jest.fn(),
  resolveApprovalAuthContext: jest.fn(),
  hasDirectRoleForResource: jest.fn(),
}));
jest.mock("@/domains/approvals/lib/resolvers", () => ({
  APPROVAL_CONFIG: {
    EVENT: {
      role: "EVENT_EDITOR",
      approveCapability: "event:manage_staff",
      grant: jest.fn(),
    },
    SERIES: {
      role: "SERIES_SESSION_CREATOR",
      approveCapability: "series:update",
      grant: jest.fn(),
    },
    CHURCH: {
      role: "EVENT_CREATOR",
      approveCapability: "church:manage_members",
      grant: jest.fn(),
    },
  },
}));
jest.mock("@/domains/notifications/queue", () => ({
  queueNotification: jest.fn(),
}));

import { submitRequestAction, reviewRequestAction } from "../requests";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import * as dal from "@/domains/approvals/dal/requests";
import { APPROVAL_CONFIG } from "@/domains/approvals/lib/resolvers";
import { queueNotification } from "@/domains/notifications/queue";

const mockGetActor = getActor as jest.Mock;
const mockCan = can as jest.Mock;
const mockDal = dal as jest.Mocked<typeof dal>;
const mockQueue = queueNotification as jest.Mock;
const mockGrant = (APPROVAL_CONFIG.EVENT.grant as jest.Mock);

const actor = { id: "user-1", isPlatformAdmin: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(actor);
  mockCan.mockResolvedValue(true);
  mockDal.hasDirectRoleForResource.mockResolvedValue(false);
  mockDal.getApproverIdsForResource.mockResolvedValue(["approver-1"]);
  mockDal.upsertApprovalRequest.mockResolvedValue({} as never);
  mockDal.resolveApprovalAuthContext.mockResolvedValue({ eventId: "e1", churchId: "ch1" });
});

describe("submitRequestAction", () => {
  const validInput = { resourceType: "EVENT", resourceId: "e1" };

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await submitRequestAction(validInput);
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await submitRequestAction({ resourceType: "BAD", resourceId: "" });
    expect(result).toHaveProperty("fieldErrors");
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when user already has direct role", async () => {
    mockDal.hasDirectRoleForResource.mockResolvedValue(true);
    const result = await submitRequestAction(validInput);
    expect(result).toEqual({ error: "You already have access." });
    expect(mockDal.upsertApprovalRequest).not.toHaveBeenCalled();
  });

  it("upserts request and fans out notifications on success", async () => {
    const result = await submitRequestAction({ ...validInput, message: "I can help" });
    expect(result).toEqual({ success: "Request submitted." });
    expect(mockDal.upsertApprovalRequest).toHaveBeenCalledWith({
      requesterId: "user-1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "I can help",
    });
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "approver-1", type: "ROLE_REQUEST_RECEIVED" })
    );
  });
});

describe("reviewRequestAction", () => {
  const pendingRequest = {
    id: "req-1",
    requesterId: "requester-1",
    resourceType: "EVENT" as const,
    resourceId: "e1",
    status: "PENDING" as const,
    requestedRole: "EVENT_EDITOR",
    requester: { id: "requester-1", name: "Alice" },
  };

  beforeEach(() => {
    mockDal.getApprovalRequestById.mockResolvedValue(pendingRequest as never);
    mockDal.updateApprovalRequest.mockResolvedValue({} as never);
    mockGrant.mockResolvedValue({});
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await reviewRequestAction({ requestId: "missing", decision: "APPROVED" });
    expect(result).toEqual({ error: "Request not found." });
  });

  it("returns error when already reviewed", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({ ...pendingRequest, status: "APPROVED" } as never);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "DENIED" });
    expect(result).toEqual({ error: "Request already reviewed." });
  });

  it("returns error when not authorized to approve", async () => {
    mockCan.mockResolvedValue(false);
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.updateApprovalRequest).not.toHaveBeenCalled();
  });

  it("approves request and grants role", async () => {
    const result = await reviewRequestAction({ requestId: "req-1", decision: "APPROVED" });
    expect(result).toEqual({ success: "Request approved." });
    expect(mockDal.resolveApprovalAuthContext).toHaveBeenCalledWith("EVENT", "e1");
    expect(mockDal.updateApprovalRequest).toHaveBeenCalledWith("req-1", {
      status: "APPROVED",
      reviewedBy: "user-1",
      reviewedAt: expect.any(Date),
    });
    expect(mockGrant).toHaveBeenCalledWith("requester-1", "e1", "user-1");
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "requester-1", type: "ROLE_REQUEST_OUTCOME" })
    );
  });

  it("denies request without granting role", async () => {
    const result = await reviewRequestAction({ requestId: "req-1", decision: "DENIED" });
    expect(result).toEqual({ success: "Request denied." });
    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "requester-1", type: "ROLE_REQUEST_OUTCOME" })
    );
  });
});
