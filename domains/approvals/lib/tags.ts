import type { ResourceType } from "@prisma/client";

// Cache tags for Access request reads. The cached readers in actions/data.ts
// and the writer in domains/roles/access.ts both build them here.
export const accessRequestTags = {
  mine: (type: ResourceType, resourceId: string, userId: string) =>
    `approval-${type}-${resourceId}-${userId}`,
  pending: (type: ResourceType, resourceId: string) =>
    `approval-pending-${type}-${resourceId}`,
  resolved: (type: ResourceType, resourceId: string) =>
    `approval-resolved-${type}-${resourceId}`,
  request: (requestId: string) => `approval-request-${requestId}`,
};
