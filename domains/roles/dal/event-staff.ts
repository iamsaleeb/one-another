import "server-only";
import { prisma } from "@/lib/db";
import type { EventRole } from "@prisma/client";

export function getEventStaff(eventId: string) {
  return prisma.eventStaffAssignment.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export function getEventStaffForUser(userId: string, eventId: string) {
  return prisma.eventStaffAssignment.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
}

export function upsertEventStaff(
  userId: string,
  eventId: string,
  role: EventRole,
  assignedBy: string
) {
  return prisma.eventStaffAssignment.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { role, assignedBy },
    create: { userId, eventId, role, assignedBy },
  });
}

export function removeEventStaff(userId: string, eventId: string) {
  return prisma.eventStaffAssignment.delete({
    where: { userId_eventId: { userId, eventId } },
  });
}
