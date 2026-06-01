"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { NotificationType, type ResourceType } from "@prisma/client";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { SubmitRequestSchema, ReviewRequestSchema } from "../validations/requests";
import {
  upsertApprovalRequest,
  updateApprovalRequest,
  getApprovalRequestById,
  getApproverIdsForResource,
  resolveApprovalAuthContext,
  hasDirectRoleForResource,
} from "../dal/requests";
import { APPROVAL_CONFIG } from "../lib/resolvers";
import { queueNotification } from "@/domains/notifications/queue";
import type { ApprovalActionState } from "../lib/types";

function resourcePath(resourceType: ResourceType, resourceId: string): string {
  const paths: Record<ResourceType, string> = {
    EVENT: `/events/${resourceId}`,
    SERIES: `/series/${resourceId}`,
    CHURCH: `/churches/${resourceId}`,
  };
  return paths[resourceType];
}

export async function submitRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = SubmitRequestSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { resourceType, resourceId, message } = parsed.data;
  const config = APPROVAL_CONFIG[resourceType];

  const alreadyHasAccess = await hasDirectRoleForResource(actor.id, resourceType, resourceId);
  if (alreadyHasAccess) return { error: "You already have access." };

  await upsertApprovalRequest({
    requesterId: actor.id,
    resourceType,
    resourceId,
    requestedRole: config.role,
    message,
  });

  const approverIds = await getApproverIdsForResource(resourceType, resourceId);
  const CONCURRENCY = 20;
  for (let i = 0; i < approverIds.length; i += CONCURRENCY) {
    await Promise.allSettled(
      approverIds.slice(i, i + CONCURRENCY).map((userId) =>
        queueNotification({
          userId,
          type: NotificationType.ROLE_REQUEST_RECEIVED,
          title: "New help request",
          body: `Someone wants to help with this ${resourceType.toLowerCase()}.`,
          data: { requesterId: actor.id, resourceType, resourceId },
        })
      )
    );
  }

  revalidateTag(`approval-${resourceType}-${resourceId}-${actor.id}`);
  revalidateTag(`approval-pending-${resourceType}-${resourceId}`);
  revalidatePath(resourcePath(resourceType, resourceId));
  return { success: "Request submitted." };
}

export async function reviewRequestAction(
  input: unknown
): Promise<ApprovalActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { requestId, decision } = parsed.data;

  const request = await getApprovalRequestById(requestId);
  if (!request) return { error: "Request not found." };
  if (request.status !== "PENDING") return { error: "Request already reviewed." };

  const authContext = await resolveApprovalAuthContext(request.resourceType, request.resourceId);
  const config = APPROVAL_CONFIG[request.resourceType];
  const allowed = await can(actor, config.approveCapability, authContext);
  if (!allowed) return { error: "Unauthorised." };

  if (decision === "APPROVED") {
    try {
      await config.grant(request.requesterId, request.resourceId, actor.id);
    } catch {
      return { error: "Failed to grant access. Please try again." };
    }
  }

  await updateApprovalRequest(requestId, {
    status: decision,
    reviewedBy: actor.id,
    reviewedAt: new Date(),
  });

  await queueNotification({
    userId: request.requesterId,
    type: NotificationType.ROLE_REQUEST_OUTCOME,
    title: decision === "APPROVED" ? "Access approved" : "Access denied",
    body:
      decision === "APPROVED"
        ? "Your request to help has been approved."
        : "Your request to help has been denied.",
    data: {
      requestId,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      decision,
    },
  });

  revalidateTag(`approval-${request.resourceType}-${request.resourceId}-${request.requesterId}`);
  revalidateTag(`approval-pending-${request.resourceType}-${request.resourceId}`);
  revalidatePath(resourcePath(request.resourceType, request.resourceId));
  return { success: decision === "APPROVED" ? "Request approved." : "Request denied." };
}
