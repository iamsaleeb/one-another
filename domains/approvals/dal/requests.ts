// domains/approvals/dal/requests.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { ApprovalStatus, ResourceType } from "@prisma/client";

export function upsertApprovalRequest(data: {
  requesterId: string;
  resourceType: ResourceType;
  resourceId: string;
  requestedRole: string;
  message?: string;
}) {
  return prisma.approvalRequest.upsert({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId: data.requesterId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
      },
    },
    update: {
      status: "PENDING",
      message: data.message ?? null,
      reviewedBy: null,
      reviewedAt: null,
    },
    create: {
      requesterId: data.requesterId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      requestedRole: data.requestedRole,
      message: data.message,
    },
  });
}

export function updateApprovalRequest(
  requestId: string,
  data: { status: ApprovalStatus; reviewedBy: string; reviewedAt: Date }
) {
  return prisma.approvalRequest.update({
    where: { id: requestId },
    data,
  });
}

export function deleteApprovalRequest(id: string) {
  return prisma.approvalRequest.delete({ where: { id } });
}

export function getApprovalRequestById(id: string) {
  return prisma.approvalRequest.findUnique({
    where: { id },
    include: { requester: { select: { id: true, name: true } } },
  });
}

export function getMyRequestForResource(
  requesterId: string,
  resourceType: ResourceType,
  resourceId: string
) {
  return prisma.approvalRequest.findUnique({
    where: {
      requesterId_resourceType_resourceId: {
        requesterId,
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
    include: {
      requester: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getApproverIdsForResource(
  resourceType: ResourceType,
  resourceId: string
): Promise<string[]> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!event) return [];
    const [eventManagers, churchManagers] = await Promise.all([
      prisma.eventStaffAssignment.findMany({
        where: { eventId: resourceId, role: "EVENT_MANAGER" },
        select: { userId: true },
      }),
      prisma.churchMembership.findMany({
        where: {
          churchId: event.churchId,
          role: { in: ["CHURCH_ADMIN", "EVENT_MANAGER"] },
        },
        select: { userId: true },
      }),
    ]);
    return [
      ...new Set([
        ...eventManagers.map((m) => m.userId),
        ...churchManagers.map((m) => m.userId),
      ]),
    ];
  }

  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    if (!series) return [];
    const [seriesManagers, churchManagers] = await Promise.all([
      prisma.seriesStaffAssignment.findMany({
        where: { seriesId: resourceId, role: "SERIES_MANAGER" },
        select: { userId: true },
      }),
      prisma.churchMembership.findMany({
        where: {
          churchId: series.churchId,
          role: { in: ["CHURCH_ADMIN", "EVENT_MANAGER"] },
        },
        select: { userId: true },
      }),
    ]);
    return [
      ...new Set([
        ...seriesManagers.map((m) => m.userId),
        ...churchManagers.map((m) => m.userId),
      ]),
    ];
  }

  // CHURCH
  const admins = await prisma.churchMembership.findMany({
    where: { churchId: resourceId, role: "CHURCH_ADMIN" },
    select: { userId: true },
  });
  return admins.map((a) => a.userId);
}

export async function resolveApprovalAuthContext(
  resourceType: ResourceType,
  resourceId: string
): Promise<{ churchId?: string; eventId?: string; seriesId?: string }> {
  if (resourceType === "EVENT") {
    const event = await prisma.event.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return { eventId: resourceId, churchId: event?.churchId };
  }
  if (resourceType === "SERIES") {
    const series = await prisma.series.findUnique({
      where: { id: resourceId },
      select: { churchId: true },
    });
    return { seriesId: resourceId, churchId: series?.churchId };
  }
  return { churchId: resourceId };
}

export async function hasDirectRoleForResource(
  userId: string,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  if (resourceType === "EVENT") {
    const row = await prisma.eventStaffAssignment.findUnique({
      where: { userId_eventId: { userId, eventId: resourceId } },
    });
    return row !== null;
  }
  if (resourceType === "SERIES") {
    const row = await prisma.seriesStaffAssignment.findUnique({
      where: { userId_seriesId: { userId, seriesId: resourceId } },
    });
    return row !== null;
  }
  const row = await prisma.churchMembership.findUnique({
    where: { userId_churchId: { userId, churchId: resourceId } },
  });
  return row !== null;
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
    orderBy: { updatedAt: "desc" },
  });
}
