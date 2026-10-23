import "server-only";
import { prisma } from "@/lib/db";
import type { ResourceType } from "@prisma/client";
import { requestResource } from "@/domains/roles/access";

// Reads only: every Access request write goes through domains/roles/access.

export function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  return prisma.accessRequest.findFirst({
    where: {
      requesterId: userId,
      ...requestResource({ type: resourceType, id: resourceId }),
    },
  });
}

export function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.accessRequest.findMany({
    where: {
      ...requestResource({ type: resourceType, id: resourceId }),
      status: "PENDING",
    },
    include: { requester: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function getResolvedRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.accessRequest.findMany({
    where: {
      ...requestResource({ type: resourceType, id: resourceId }),
      status: { not: "PENDING" },
    },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getAccessRequestById(id: string) {
  return prisma.accessRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}
