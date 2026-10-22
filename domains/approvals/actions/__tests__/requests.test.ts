jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    series: { findUnique: jest.fn() },
  },
}));
jest.mock("@/domains/approvals/dal/requests", () => ({
  upsertApprovalRequest: jest.fn(),
  getMyRequestForResource: jest.fn(),
  getApprovalRequestById: jest.fn(),
  updateApprovalRequest: jest.fn(),
  updateApprovalRequestIfPending: jest.fn(),
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

import { grants, platformAdmin, signInAs } from "@/domains/roles/testing";
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

const mockUpdateTag = updateTag as jest.Mock;
const mockUpsert = dal.upsertApprovalRequest as jest.Mock;
const mockGetMyRequest = dal.getMyRequestForResource as jest.Mock;
const mockGetById = dal.getApprovalRequestById as jest.Mock;
const mockUpdate = dal.updateApprovalRequest as jest.Mock;
const mockUpdateIfPending = dal.updateApprovalRequestIfPending as jest.Mock;
const mockEventFindUnique = db.prisma.event.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindUnique.mockResolvedValue({ churchId: "church-1" });
  signInAs("u1", platformAdmin());
  mockGetMyRequest.mockResolvedValue(null);
  mockUpdateIfPending.mockResolvedValue(1);
});

describe("submitRequestAction", () => {
  it("returns error when not authenticated", async () => {
    signInAs(null);
    const result = await submitRequestAction({
      resourceType: "EVENT",
      resourceId: "e1",
    });
    expect(result.error).toBe("You must be signed in.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when user already has the role", async () => {
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

  it("returns error when existing request is PENDING", async () => {
    (config.APPROVAL_CONFIG.EVENT.hasRoleFn as jest.Mock).mockResolvedValue(
      false
    );
    mockGetMyRequest.mockResolvedValue({ status: "PENDING" });
    const result = await submitRequestAction({
      resourceType: "EVENT",
      resourceId: "e1",
    });
    expect(result.error).toBe("You already have a pending request.");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts with requestedRole and invalidates cache on success", async () => {
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
    signInAs(null);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockGetById.mockResolvedValue(null);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not PENDING", async () => {
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "APPROVED",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
  });

  it("returns error when request is already processed (race condition)", async () => {
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    mockUpdateIfPending.mockResolvedValue(0);
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBe("Request was already processed.");
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).not.toHaveBeenCalled();
  });

  it("claims atomically then calls grantFn on APPROVED", async () => {
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    };
    mockGetById.mockResolvedValue(request);
    const callOrder: string[] = [];
    mockUpdateIfPending.mockImplementation(async () => {
      callOrder.push("claim");
      return 1;
    });
    (config.APPROVAL_CONFIG.EVENT.grantFn as jest.Mock).mockImplementation(
      async () => {
        callOrder.push("grant");
      }
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeUndefined();
    expect(callOrder).toEqual(["claim", "grant"]);
    expect(mockUpdateIfPending).toHaveBeenCalledWith(
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

  it("rolls back to PENDING and returns error when grantFn throws", async () => {
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    (config.APPROVAL_CONFIG.EVENT.grantFn as jest.Mock).mockRejectedValue(
      new Error("DB error")
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeDefined();
    expect(mockUpdate).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ status: "PENDING", reviewedBy: null })
    );
  });

  it("does not call grantFn on DENIED", async () => {
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    };
    mockGetById.mockResolvedValue(request);
    mockUpdate.mockResolvedValue({});
    await reviewRequestAction({ requestId: "r1", decision: "DENIED" });
    expect(config.APPROVAL_CONFIG.EVENT.grantFn).not.toHaveBeenCalled();
  });

  it("returns error when reviewer is the requester", async () => {
    const request = {
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u1",
    };
    mockGetById.mockResolvedValue(request);
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
    signInAs(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not found", async () => {
    mockGetById.mockResolvedValue(null);
    const result = await cancelRequestAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when user is not the requester", async () => {
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

  it("updates status to CANCELLED, sets reviewedAt, and invalidates all relevant cache", async () => {
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
    expect(mockUpdate).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({
        status: "CANCELLED",
        reviewedAt: expect.any(Date),
      })
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});

describe("revokeAccessAction", () => {
  it("returns error when not authenticated", async () => {
    signInAs(null);
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("returns error when request not APPROVED", async () => {
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "PENDING",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeDefined();
  });

  it("calls revokeFn before status update and records reviewedBy on success", async () => {
    mockGetById.mockResolvedValue({
      id: "r1",
      status: "APPROVED",
      resourceType: "EVENT",
      resourceId: "e1",
      requesterId: "u2",
    });
    mockUpdate.mockResolvedValue({});
    const callOrder: string[] = [];
    (config.APPROVAL_CONFIG.EVENT.revokeFn as jest.Mock).mockImplementation(
      async () => {
        callOrder.push("revoke");
      }
    );
    mockUpdate.mockImplementation(async () => {
      callOrder.push("update");
      return {};
    });
    const result = await revokeAccessAction({ requestId: "r1" });
    expect(result.error).toBeUndefined();
    expect(callOrder).toEqual(["revoke", "update"]);
    expect(mockUpdate).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ status: "REVOKED", reviewedBy: "u1" })
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-resolved-EVENT-e1");
    expect(mockUpdateTag).toHaveBeenCalledWith("approval-request-r1");
  });
});

describe("who may approve Helpers", () => {
  const pendingEventRequest = {
    id: "r1",
    status: "PENDING",
    resourceType: "EVENT",
    resourceId: "e1",
    requesterId: "u2",
  };

  beforeEach(() => {
    mockEventFindUnique.mockResolvedValue({
      id: "e1",
      churchId: "church-1",
      seriesId: null,
    });
    mockGetById.mockResolvedValue(pendingEventRequest);
    (config.APPROVAL_CONFIG.EVENT.grantFn as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  it("an Event manager may approve", async () => {
    signInAs(
      "u1",
      grants({ event: [{ eventId: "e1", role: "EVENT_MANAGER" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeUndefined();
  });

  it("a Church manager may approve via the role cascade", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "church-1", role: "EVENT_MANAGER" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBeUndefined();
  });

  it("an Event editor may not approve", async () => {
    signInAs(
      "u1",
      grants({ event: [{ eventId: "e1", role: "EVENT_EDITOR" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBe("Unauthorised.");
    expect(mockUpdateIfPending).not.toHaveBeenCalled();
  });

  it("a Church manager of another Church may not approve", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "church-2", role: "CHURCH_ADMIN" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.error).toBe("Unauthorised.");
  });
});

describe("who may approve Series and Church Helpers", () => {
  const mockSeriesFindUnique = db.prisma.series.findUnique as jest.Mock;
  const pending = (resourceType: string, resourceId: string) => ({
    id: "r2",
    status: "PENDING",
    resourceType,
    resourceId,
    requesterId: "u2",
  });

  beforeEach(() => {
    mockSeriesFindUnique.mockResolvedValue({ id: "s1", churchId: "church-1" });
    (config.APPROVAL_CONFIG.SERIES.grantFn as jest.Mock).mockResolvedValue(
      undefined
    );
    (config.APPROVAL_CONFIG.CHURCH.grantFn as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  it("the Series manager may approve a Series request", async () => {
    mockGetById.mockResolvedValue(pending("SERIES", "s1"));
    signInAs(
      "u1",
      grants({ series: [{ seriesId: "s1", role: "SERIES_MANAGER" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r2",
      decision: "APPROVED",
    });
    expect(result.error).toBeUndefined();
  });

  it("a session creator may not approve a Series request", async () => {
    mockGetById.mockResolvedValue(pending("SERIES", "s1"));
    signInAs(
      "u1",
      grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
    );
    const result = await reviewRequestAction({
      requestId: "r2",
      decision: "APPROVED",
    });
    expect(result.error).toBe("Unauthorised.");
  });

  it("reports a deleted Series as not found", async () => {
    mockGetById.mockResolvedValue(pending("SERIES", "gone"));
    mockSeriesFindUnique.mockResolvedValue(null);
    const result = await reviewRequestAction({
      requestId: "r2",
      decision: "APPROVED",
    });
    expect(result.error).toBe("Resource not found.");
  });

  it("only a Church admin may approve a Church request", async () => {
    mockGetById.mockResolvedValue(pending("CHURCH", "church-1"));
    signInAs(
      "u1",
      grants({ church: [{ churchId: "church-1", role: "EVENT_MANAGER" }] })
    );
    expect(
      (await reviewRequestAction({ requestId: "r2", decision: "APPROVED" }))
        .error
    ).toBe("Unauthorised.");
    signInAs(
      "u1",
      grants({ church: [{ churchId: "church-1", role: "CHURCH_ADMIN" }] })
    );
    expect(
      (await reviewRequestAction({ requestId: "r2", decision: "APPROVED" }))
        .error
    ).toBeUndefined();
  });
});
