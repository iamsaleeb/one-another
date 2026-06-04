"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import type { ResourceType } from "@prisma/client";
import {
  getMyRequestForResource as dalGetMy,
  getPendingRequestsForResource as dalGetPending,
  getResolvedRequestsForResource as dalGetAll,
  getApprovalRequestById as dalGetById,
} from "../dal/requests";

export async function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  cacheTag(`approval-${resourceType}-${resourceId}-${userId}`);
  cacheLife("seconds");
  return dalGetMy(resourceType, resourceId, userId);
}

export async function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-pending-${resourceType}-${resourceId}`);
  cacheLife("seconds");
  return dalGetPending(resourceType, resourceId);
}

export async function getResolvedRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-resolved-${resourceType}-${resourceId}`);
  cacheLife("minutes");
  return dalGetAll(resourceType, resourceId);
}

export async function getApprovalRequestById(requestId: string) {
  cacheTag(`approval-request-${requestId}`);
  cacheLife("minutes");
  return dalGetById(requestId);
}
