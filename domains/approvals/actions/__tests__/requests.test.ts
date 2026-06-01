jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  updateTag: jest.fn(),
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
  deleteApprovalRequest: jest.fn(),
}));
jest.mock("@/domains/approvals/lib/resolvers", () => ({
  APPROVAL_CONFIG: {
    EVENT: {
      role: "EVENT_EDITOR",
      approveCapability: "event:manage_staff",
      grant: jest.fn(),
      revoke: jest.fn(),
    },
    SERIES: {
      role: "SERIES_SESSION_CREATOR",
      approveCapability: "series:update",
      grant: jest.fn(),
      revoke: jest.fn(),
    },
    CHURCH: {
      role: "EVENT_CREATOR",
      approveCapability: "church:manage_members",
      grant: jest.fn(),
      revoke: jest.fn(),
    },
  },
}));
jest.mock("@/domains/notifications/queue", () => ({
  queueNotification: jest.fn(),
}));

import {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "../requests";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import * as dal from "@/domains/approvals/dal/requests";
import { APPROVAL_CONFIG } from "@/domains/approvals/lib/resolvers";
import { queueNotification } from "@/domains/notifications/queue";

const mockGetActor = getActor as jest.Mock;
const mockCan = can as jest.Mock;
const mockDal = dal as jest.Mocked<typeof dal>;
const mockQueue = queueNotification as jest.Mock;
const mockGrant = APPROVAL_CONFIG.EVENT.grant as jest.Mock;
const mockRevoke = APPROVAL_CONFIG.EVENT.revoke as jest.Mock;

const actor = { id: "user-1", isPlatformAdmin: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(actor);
  mockCan.mockResolvedValue(true);
  mockDal.hasDirectRoleForResource.mockResolvedValue(false);
  mockDal.getApproverIdsForResource.mockResolvedValue(["approver-1"]);
  mockDal.upsertApprovalRequest.mockResolvedValue({} as never);
  mockDal.resolveApprovalAuthContext.mockResolvedValue({
    eventId: "e1",
    churchId: "ch1",
  });
  mockRevoke.mockResolvedValue({});
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
    const result = await submitRequestAction({
      resourceType: "BAD",
      resourceId: "",
    });
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
    const result = await submitRequestAction({
      ...validInput,
      message: "I can help",
    });
    expect(result).toEqual({ success: "Request submitted." });
    expect(mockDal.upsertApprovalRequest).toHaveBeenCalledWith({
      requesterId: "user-1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "I can help",
    });
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "approver-1",
        type: "ROLE_REQUEST_RECEIVED",
      })
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
    const result = await reviewRequestAction({
      requestId: "req-1",
      decision: "APPROVED",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await reviewRequestAction({
      requestId: "missing",
      decision: "APPROVED",
    });
    expect(result).toEqual({ error: "Request not found." });
  });

  it("returns error when already reviewed", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...pendingRequest,
      status: "APPROVED",
    } as never);
    const result = await reviewRequestAction({
      requestId: "req-1",
      decision: "DENIED",
    });
    expect(result).toEqual({ error: "Request already reviewed." });
  });

  it("returns error when not authorized to approve", async () => {
    mockCan.mockResolvedValue(false);
    const result = await reviewRequestAction({
      requestId: "req-1",
      decision: "APPROVED",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.updateApprovalRequest).not.toHaveBeenCalled();
  });

  it("approves request and grants role", async () => {
    const result = await reviewRequestAction({
      requestId: "req-1",
      decision: "APPROVED",
    });
    expect(result).toEqual({ success: "Request approved." });
    expect(mockDal.resolveApprovalAuthContext).toHaveBeenCalledWith(
      "EVENT",
      "e1"
    );
    expect(mockDal.updateApprovalRequest).toHaveBeenCalledWith("req-1", {
      status: "APPROVED",
      reviewedBy: "user-1",
      reviewedAt: expect.any(Date),
    });
    expect(mockGrant).toHaveBeenCalledWith("requester-1", "e1", "user-1");
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "requester-1",
        type: "ROLE_REQUEST_OUTCOME",
      })
    );
  });

  it("denies request without granting role", async () => {
    const result = await reviewRequestAction({
      requestId: "req-1",
      decision: "DENIED",
    });
    expect(result).toEqual({ success: "Request denied." });
    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "requester-1",
        type: "ROLE_REQUEST_OUTCOME",
      })
    );
  });
});

describe("cancelRequestAction", () => {
  const myRequest = {
    id: "req-1",
    requesterId: "user-1",
    resourceType: "EVENT" as const,
    resourceId: "e1",
    status: "PENDING" as const,
    requestedRole: "EVENT_EDITOR",
    requester: { id: "user-1", name: "Alice" },
  };

  beforeEach(() => {
    mockDal.getApprovalRequestById.mockResolvedValue(myRequest as never);
    mockDal.deleteApprovalRequest.mockResolvedValue({} as never);
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await cancelRequestAction({ requestId: "" });
    expect(result).toHaveProperty("fieldErrors");
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "missing" });
    expect(result).toEqual({ error: "Request not found." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when not the requester", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...myRequest,
      requesterId: "someone-else",
    } as never);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when request already reviewed", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...myRequest,
      status: "APPROVED",
    } as never);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Request already reviewed." });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });

  it("updates status to CANCELLED on success", async () => {
    mockDal.updateApprovalRequest.mockResolvedValue({} as never);
    const result = await cancelRequestAction({ requestId: "req-1" });
    expect(result).toEqual({ success: "Request cancelled." });
    expect(mockDal.updateApprovalRequest).toHaveBeenCalledWith("req-1", {
      status: "CANCELLED",
      reviewedBy: "user-1",
      reviewedAt: expect.any(Date),
    });
    expect(mockDal.deleteApprovalRequest).not.toHaveBeenCalled();
  });
});

describe("revokeAccessAction", () => {
  const approvedRequest = {
    id: "req-1",
    requesterId: "requester-1",
    resourceType: "EVENT" as const,
    resourceId: "e1",
    status: "APPROVED" as const,
    requestedRole: "EVENT_EDITOR",
    requester: { id: "requester-1", name: "Alice" },
  };

  beforeEach(() => {
    mockDal.getApprovalRequestById.mockResolvedValue(approvedRequest as never);
    mockDal.updateApprovalRequest.mockResolvedValue({} as never);
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await revokeAccessAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockDal.updateApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns fieldErrors on invalid input", async () => {
    const result = await revokeAccessAction({ requestId: "" });
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when request not found", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue(null);
    const result = await revokeAccessAction({ requestId: "missing" });
    expect(result).toEqual({ error: "Request not found." });
  });

  it("returns error when status is not APPROVED", async () => {
    mockDal.getApprovalRequestById.mockResolvedValue({
      ...approvedRequest,
      status: "PENDING",
    } as never);
    const result = await revokeAccessAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Request is not approved." });
    expect(mockDal.updateApprovalRequest).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    mockCan.mockResolvedValue(false);
    const result = await revokeAccessAction({ requestId: "req-1" });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it("revokes access and updates status to REVOKED", async () => {
    const result = await revokeAccessAction({ requestId: "req-1" });
    expect(result).toEqual({ success: "Access revoked." });
    expect(mockRevoke).toHaveBeenCalledWith("requester-1", "e1");
    expect(mockDal.updateApprovalRequest).toHaveBeenCalledWith("req-1", {
      status: "REVOKED",
      reviewedBy: "user-1",
      reviewedAt: expect.any(Date),
    });
    expect(mockQueue).not.toHaveBeenCalled();
  });
});
