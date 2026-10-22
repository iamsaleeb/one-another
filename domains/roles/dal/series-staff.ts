import "server-only";
import { prisma } from "@/lib/db";
import type { SeriesRole } from "@prisma/client";

export function getSeriesStaffForUser(userId: string, seriesId: string) {
  return prisma.seriesStaffAssignment.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
  });
}

export function upsertSeriesStaff(
  userId: string,
  seriesId: string,
  role: SeriesRole,
  assignedBy: string
) {
  return prisma.seriesStaffAssignment.upsert({
    where: { userId_seriesId: { userId, seriesId } },
    update: { role, assignedBy },
    create: { userId, seriesId, role, assignedBy },
  });
}

export function removeSeriesStaff(userId: string, seriesId: string) {
  return prisma.seriesStaffAssignment.delete({
    where: { userId_seriesId: { userId, seriesId } },
  });
}
