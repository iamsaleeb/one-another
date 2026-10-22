import "server-only";
import { prisma } from "@/lib/db";
import type { ChurchRole } from "@prisma/client";

export function getChurchMembership(userId: string, churchId: string) {
  return prisma.churchMembership.findUnique({
    where: { userId_churchId: { userId, churchId } },
  });
}

export function upsertChurchMembership(
  userId: string,
  churchId: string,
  role: ChurchRole,
  assignedBy: string
) {
  return prisma.churchMembership.upsert({
    where: { userId_churchId: { userId, churchId } },
    update: { role, assignedBy },
    create: { userId, churchId, role, assignedBy },
  });
}

export function removeChurchMembership(userId: string, churchId: string) {
  return prisma.churchMembership.delete({
    where: { userId_churchId: { userId, churchId } },
  });
}
