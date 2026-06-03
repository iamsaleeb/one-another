"use server";

import { updateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type AuthContext } from "@/domains/roles/lib/can";
import {
  Capabilities,
  type Capability,
} from "@/domains/roles/lib/capabilities";
import type { ResourceType } from "@prisma/client";
import { sessionToActor } from "@/domains/roles/lib/session";

const RESOURCE_PATH: Record<ResourceType, string> = {
  EVENT: "events",
  SERIES: "series",
  CHURCH: "churches",
};
import {
  upsertApprovalRequest,
  getApprovalRequestById,
  updateApprovalRequest,
} from "../dal/requests";
import { APPROVAL_CONFIG } from "../lib/config";
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../validations/requests";
import type { ApprovalActionState } from "../lib/types";

async function resolveAuthContext(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ capability: Capability; context: AuthContext }> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return {
      capability: Capabilities.EVENT_MANAGE_STAFF,
      context: { churchId: event?.churchId ?? "", eventId: resourceId },
    };
  }
  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return {
      capability: Capabilities.SERIES_UPDATE,
      context: { churchId: series?.churchId ?? "", seriesId: resourceId },
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

  const requestedRole = String(APPROVAL_CONFIG[resourceType].role);

  await upsertApprovalRequest({
    requesterId: userId,
    resourceType,
    resourceId,
    requestedRole,
    message,
  });

  updateTag(`approval-${resourceType}-${resourceId}-${userId}`);
  updateTag(`approval-pending-${resourceType}-${resourceId}`);

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

  const { capability, context } = await resolveAuthContext(
    request.resourceType,
    request.resourceId
  );
  const allowed = await can(actor, capability, context);
  if (!allowed) return { error: "Unauthorised." };

  await updateApprovalRequest(requestId, {
    status: decision,
    reviewedBy: actor.id,
    reviewedAt: new Date(),
  });

  if (decision === "APPROVED") {
    await APPROVAL_CONFIG[request.resourceType].grantFn(
      request.resourceId,
      request.requesterId,
      actor.id
    );
  }

  updateTag(
    `approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`
  );
  updateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-resolved-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);
  revalidatePath(
    `/${RESOURCE_PATH[request.resourceType]}/${request.resourceId}/helpers`
  );

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

  await updateApprovalRequest(requestId, { status: "CANCELLED" });

  updateTag(`approval-${request.resourceType}-${request.resourceId}-${userId}`);
  updateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);

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

  const { capability, context } = await resolveAuthContext(
    request.resourceType,
    request.resourceId
  );
  const allowed = await can(actor, capability, context);
  if (!allowed) return { error: "Unauthorised." };

  await updateApprovalRequest(requestId, { status: "REVOKED" });

  try {
    await APPROVAL_CONFIG[request.resourceType].revokeFn(
      request.resourceId,
      request.requesterId
    );
  } catch {
    // idempotent — role may have already been removed
  }

  updateTag(
    `approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`
  );
  updateTag(`approval-resolved-${request.resourceType}-${request.resourceId}`);
  updateTag(`approval-request-${requestId}`);
  revalidatePath(
    `/${RESOURCE_PATH[request.resourceType]}/${request.resourceId}/helpers`
  );

  return {};
}
