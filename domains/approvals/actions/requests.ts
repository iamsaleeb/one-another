"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type AuthContext } from "@/domains/roles/lib/can";
import {
  Capabilities,
  type Capability,
} from "@/domains/roles/lib/capabilities";
import type { ResourceType } from "@prisma/client";
import { sessionToActor } from "@/domains/roles/lib/session";
import {
  upsertApprovalRequest,
  getApprovalRequestById,
  getMyRequestForResource,
  updateApprovalRequest,
  updateApprovalRequestIfPending,
} from "../dal/requests";
import { APPROVAL_CONFIG } from "../lib/config";
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../validations/requests";
import type { ApprovalActionState } from "../lib/types";
import {
  invalidateRequesterView,
  invalidatePendingApprovals,
  invalidateResolvedApprovals,
  invalidateApprovalRequestDetail,
  revalidateHelpersPage,
} from "../cache";

async function resolveAuthContext(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ capability: Capability; context: AuthContext } | null> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!event) return null;
    return {
      capability: Capabilities.EVENT_MANAGE_STAFF,
      context: { churchId: event.churchId, eventId: resourceId },
    };
  }
  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!series) return null;
    return {
      capability: Capabilities.SERIES_UPDATE,
      context: { churchId: series.churchId, seriesId: resourceId },
    };
  }
  return {
    capability: Capabilities.CHURCH_MANAGE_MEMBERS,
    context: { churchId: resourceId },
  };
}

export async function submitRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = SubmitRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { resourceType, resourceId, message } = parsed.data;
  const userId = session.user.id;

  const alreadyHasRole = await APPROVAL_CONFIG[resourceType].hasRoleFn(
    resourceId,
    userId
  );
  if (alreadyHasRole)
    return { error: "You already have access to this resource." };

  const existingRequest = await getMyRequestForResource(
    resourceType,
    resourceId,
    userId
  );
  if (existingRequest?.status === "PENDING")
    return { error: "You already have a pending request." };

  const requestedRole = String(APPROVAL_CONFIG[resourceType].role);

  await upsertApprovalRequest({
    requesterId: userId,
    resourceType,
    resourceId,
    requestedRole,
    message,
  });

  invalidateRequesterView(resourceType, resourceId, userId);
  invalidatePendingApprovals(resourceType, resourceId);

  return {};
}

export async function reviewRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId, decision } = parsed.data;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "PENDING")
    return { error: "Request is no longer pending." };
  if (request.requesterId === actor.id) return { error: "Unauthorised." };

  const authCtx = await resolveAuthContext(
    request.resourceType,
    request.resourceId
  );
  if (!authCtx) return { error: "Resource not found." };
  const allowed = await can(actor, authCtx.capability, authCtx.context);
  if (!allowed) return { error: "Unauthorised." };

  const reviewedAt = new Date();
  const claimed = await updateApprovalRequestIfPending(requestId, {
    status: decision,
    reviewedBy: actor.id,
    reviewedAt,
  });
  if (claimed === 0) return { error: "Request was already processed." };

  if (decision === "APPROVED") {
    try {
      await APPROVAL_CONFIG[request.resourceType].grantFn(
        request.resourceId,
        request.requesterId,
        actor.id
      );
    } catch {
      await updateApprovalRequest(requestId, {
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
      });
      return { error: "Failed to grant access. Please try again." };
    }
  }

  invalidateRequesterView(
    request.resourceType,
    request.resourceId,
    request.requesterId
  );
  invalidatePendingApprovals(request.resourceType, request.resourceId);
  invalidateResolvedApprovals(request.resourceType, request.resourceId);
  invalidateApprovalRequestDetail(requestId);
  revalidateHelpersPage(request.resourceType, request.resourceId);

  return {};
}

export async function cancelRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = CancelRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId } = parsed.data;
  const userId = session.user.id;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.requesterId !== userId) return { error: "Unauthorised." };
  if (request.status !== "PENDING") return { error: "Request is not pending." };

  await updateApprovalRequest(requestId, {
    status: "CANCELLED",
    reviewedAt: new Date(),
  });

  invalidateRequesterView(request.resourceType, request.resourceId, userId);
  invalidatePendingApprovals(request.resourceType, request.resourceId);
  invalidateResolvedApprovals(request.resourceType, request.resourceId);
  invalidateApprovalRequestDetail(requestId);
  revalidateHelpersPage(request.resourceType, request.resourceId);

  return {};
}

export async function revokeAccessAction(
  input: unknown
): Promise<ApprovalActionState> {
  const session = await auth();
  const actor = sessionToActor(session);
  if (!actor) return { error: "Unauthorised." };

  const parsed = RevokeAccessSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { requestId } = parsed.data;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "APPROVED")
    return { error: "Access is not currently approved." };

  const authCtx = await resolveAuthContext(
    request.resourceType,
    request.resourceId
  );
  if (!authCtx) return { error: "Resource not found." };
  const allowed = await can(actor, authCtx.capability, authCtx.context);
  if (!allowed) return { error: "Unauthorised." };

  try {
    await APPROVAL_CONFIG[request.resourceType].revokeFn(
      request.resourceId,
      request.requesterId
    );
  } catch {
    // idempotent — role may have already been removed
  }

  await updateApprovalRequest(requestId, {
    status: "REVOKED",
    reviewedBy: actor.id,
    reviewedAt: new Date(),
  });

  invalidateRequesterView(
    request.resourceType,
    request.resourceId,
    request.requesterId
  );
  invalidateResolvedApprovals(request.resourceType, request.resourceId);
  invalidateApprovalRequestDetail(requestId);
  revalidateHelpersPage(request.resourceType, request.resourceId);

  return {};
}
