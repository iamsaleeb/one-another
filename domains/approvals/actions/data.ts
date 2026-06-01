"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import type { ResourceType } from "@prisma/client";
import {
  getMyRequestForResource as dalGetMyRequest,
  getPendingRequestsForResource as dalGetPending,
  getAllRequestsForResource as dalGetAllResolved,
} from "../dal/requests";

export async function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  cacheTag(`approval-${resourceType}-${resourceId}-${userId}`);
  cacheLife("minutes");
  return dalGetMyRequest(userId, resourceType, resourceId);
}

export async function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-pending-${resourceType}-${resourceId}`);
  cacheLife("minutes");
  return dalGetPending(resourceType, resourceId);
}

export async function getAllRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  cacheTag(`approval-resolved-${resourceType}-${resourceId}`);
  cacheLife("minutes");
  return dalGetAllResolved(resourceType, resourceId);
}
