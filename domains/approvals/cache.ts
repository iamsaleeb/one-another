import "server-only";
import { updateTag, revalidatePath } from "next/cache";
import type { ResourceType } from "@prisma/client";

const RESOURCE_PATH: Record<ResourceType, string> = {
  EVENT: "events",
  SERIES: "series",
  CHURCH: "churches",
};

export function invalidateRequesterView(
  resourceType: ResourceType,
  resourceId: string,
  requesterId: string
) {
  updateTag(`approval-${resourceType}-${resourceId}-${requesterId}`);
}

export function invalidatePendingApprovals(
  resourceType: ResourceType,
  resourceId: string
) {
  updateTag(`approval-pending-${resourceType}-${resourceId}`);
}

export function invalidateResolvedApprovals(
  resourceType: ResourceType,
  resourceId: string
) {
  updateTag(`approval-resolved-${resourceType}-${resourceId}`);
}

export function invalidateApprovalRequestDetail(requestId: string) {
  updateTag(`approval-request-${requestId}`);
}

export function revalidateHelpersPage(
  resourceType: ResourceType,
  resourceId: string
) {
  revalidatePath(`/${RESOURCE_PATH[resourceType]}/${resourceId}/helpers`);
}
