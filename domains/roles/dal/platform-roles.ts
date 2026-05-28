import "server-only";
import { prisma } from "@/lib/db";
import type { PlatformRole } from "@prisma/client";

export function getPlatformRole(userId: string) {
  return prisma.platformRoleAssignment.findFirst({ where: { userId } });
}

export function getPlatformAdmins() {
  return prisma.platformRoleAssignment.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export function upsertPlatformRole(
  userId: string,
  role: PlatformRole,
  assignedBy: string
) {
  return prisma.platformRoleAssignment.upsert({
    where: { userId_role: { userId, role } },
    update: { assignedBy },
    create: { userId, role, assignedBy },
  });
}

export function removePlatformRole(userId: string, role: PlatformRole) {
  return prisma.platformRoleAssignment.delete({
    where: { userId_role: { userId, role } },
  });
}
