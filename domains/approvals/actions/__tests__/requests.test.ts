jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/domains/roles/lib/can", () => ({ can: jest.fn() }));
jest.mock("@/domains/roles/lib/session", () => ({ sessionToActor: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    series: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  getApprovalRequestById: jest.fn(),
  updateApprovalRequest: jest.fn(),
}));
jest.mock("@/domains/approvals/lib/config", () => ({
  APPROVAL_CONFIG: {
    EVENT: {
      role: "EVENT_EDITOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
    SERIES: {
      role: "SERIES_SESSION_CREATOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
    CHURCH: {
      role: "EVENT_CREATOR",
      grantFn: jest.fn().mockResolvedValue(undefined),
      revokeFn: jest.fn().mockResolvedValue(undefined),
      hasRoleFn: jest.fn().mockResolvedValue(false),
    },
  },
}));

import { auth } from "@/auth";
import { can } from "@/domains/roles/lib/can";
import { sessionToActor } from "@/domains/roles/lib/session";
import { updateTag } from "next/cache";
import * as dal from "@/domains/approvals/dal/requests";
import * as db from "@/lib/db";
import * as config from "@/domains/approvals/lib/config";
import {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "../requests";

const mockAuth = auth as jest.Mock;
const mockCan = can as jest.Mock;
const mockSessionToActor = sessionToActor as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockUpsert = dal.upsertApprovalRequest as jest.Mock;
const mockGetById = dal.getApprovalRequestById as jest.Mock;
const mockUpdate = dal.updateApprovalRequest as jest.Mock;
const mockEventFindUnique = db.prisma.event.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindUnique.mockResolvedValue({ churchId: "church-1" });
  mockSessionToActor.mockReturnValue({ id: "u1", isPlatformAdmin: false });
});

describe("submitRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await submitRequestAction({
      resourceType: "EVENT",
      resourceId: "e1",
    });
    expect(result.error).toBe("You must be signed in.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when user already has the role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    (config.APPROVAL_CONFIG.EVENT.hasRoleFn as jest.Mock).mockResolvedValue(
      true
    );
    const result = await submitRequestAction({
      resourceType: "EVENT",
      resourceId: "e1",
    });
    expect(result.error).toBe("You already have access to this resource.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts with requestedRole and invalidates cache on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    (config.APPROVAL_CONFIG.EVENT.hasRoleFn as jest.Mock).mockResolvedValue(
      false
    );
    mockUpsert.mockResolvedValue({});
    const result = await submitRequestAction({
      resourceType: "EVENT",
      resourceId: "e1",
      message: "hi",
    });
    expect(result.error).toBeUndefined();
    expect(mockUpsert).toHaveBeenCalledWith({
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
      requestedRole: "EVENT_EDITOR",
      message: "hi",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
  });
});

describe("reviewRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToActor.mockReturnValue(null);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue(null);
    mockCan.mockResolvedValue(true);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not PENDING", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "APPROVED",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    mockCan.mockResolvedValue(true);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("calls grantFn and uses reviewedBy on APPROVED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    };
    mockGetById.mockResolvedValue(request);
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ status: "APPROVED", reviewedBy: "u1" })
    );
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).toHaveBeenCalledWith(
      "e1",
      "u2",
      "u1"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });

  it("does not call grantFn on DENIED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    };
    mockGetById.mockResolvedValue(request);
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    await reviewRequestAction({ requestId: "r1", decision: "DENIED" });
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).not.toHaveBeenCalled();
  });

  it("returns error when reviewer is the requester", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u1",
    }; // same id as actor
    mockGetById.mockResolvedValue(request);
    mockCan.mockResolvedValue(true);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).not.toHaveBeenCalled();
  });
});

describe("cancelRequestAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when user is not the requester", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      requesterId: "other",
      resourceType: "EVENT",
      resourceId: "e1",
    });
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("updates status to CANCELLED and invalidates cache", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      requesterId: "u1",
      resourceType: "EVENT",
      resourceId: "e1",
    });
    mockUpdate.mockResolvedValue({});
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith("r1", { status: "CANCELLED" });
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});

describe("revokeAccessAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToActor.mockReturnValue(null);
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not APPROVED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    mockCan.mockResolvedValue(true);
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("calls revokeFn and invalidates cache on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "APPROVED",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    mockCan.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeUndefined();
    expect(config.APPROVAL_CONFIG.EVENT.revokeFn).toHaveBeenCalledWith(
      "e1",
      "u2"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});
