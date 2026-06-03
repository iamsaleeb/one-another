import "server-only";
import { prisma } from "@/lib/db";
import type { ApprovalStatus, ResourceType } from "@prisma/client";

interface UpsertInput {
  requesterId: string;
  resourceType: ResourceType;
  resourceId: string;
  requestedRole: string;
  message?: string;
}

export function upsertApprovalRequest(input: UpsertInput) {
  const { requesterId, resourceType, resourceId, requestedRole, message } =
    input;
  return prisma.approvalRequest.upsert({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId,
        resourceType,
        resourceId,
      },
    },
    create: {
      requesterId,
      resourceType,
      resourceId,
      requestedRole,
      message,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
      message,
      requestedRole,
      reviewedBy: null,
      reviewedAt: null,
    },
  });
}

export function getMyRequestForResource(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
) {
  return prisma.approvalRequest.findUnique({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId: userId,
        resourceType,
        resourceId,
      },
    },
  });
}

export function getPendingRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.approvalRequest.findMany({
    where: { resourceType, resourceId, status: "PENDING" },
    include: { requester: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function getAllRequestsForResource(
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.approvalRequest.findMany({
    where: { resourceType, resourceId, status: { not: "PENDING" } },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getApprovalRequestById(id: string) {
  return prisma.approvalRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

export function updateApprovalRequest(
  id: string,
  data: Partial<{
    status: ApprovalStatus;
    reviewedBy: string;
    reviewedAt: Date;
  }>
) {
  return prisma.approvalRequest.update({ where: { id }, data });
}

export function deleteApprovalRequest(id: string) {
  return prisma.approvalRequest.delete({ where: { id } });
}
