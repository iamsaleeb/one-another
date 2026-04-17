import "server-only";

import { prisma } from "@/lib/db";
import { canManageChurch } from "@/lib/permissions";
import type { CreateSeriesInput } from "@/lib/validations/series";

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

export async function createSeries(
  data: CreateSeriesInput,
  userId: string,
  userRole: string
): Promise<DalError | { id: string; churchId: string }> {
  const { name, description, cadence, location, host, tag, churchId, photoUrl } = data;

  const allowed = await canManageChurch(userId, userRole, churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  const created = await prisma.series.create({
    data: {
      name,
      description,
      cadence,
      location,
      host,
      tag,
      churchId,
      photoUrl: photoUrl ?? null,
      createdById: userId,
    },
  });

  return { id: created.id, churchId };
}

export async function updateSeries(
  id: string,
  data: CreateSeriesInput,
  userId: string,
  userRole: string
): Promise<DalError | { oldChurchId: string; newChurchId: string }> {
  const { name, description, cadence, location, host, tag, churchId, photoUrl } = data;

  const existing = await prisma.series.findUnique({ where: { id }, select: { churchId: true } });
  if (!existing) return { error: "Series not found." };

  const allowedOriginal = await canManageChurch(userId, userRole, existing.churchId);
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await canManageChurch(userId, userRole, churchId);
    if (!allowedNew) return { error: "Unauthorised." };
  }

  await prisma.series.update({
    where: { id },
    data: { name, description, cadence, location, host, tag, churchId, photoUrl: photoUrl ?? null },
  });

  return { oldChurchId: existing.churchId, newChurchId: churchId };
}

export async function deleteSeries(
  id: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string }> {
  const series = await prisma.series.findUnique({ where: { id }, select: { churchId: true } });
  if (!series) return { error: "Series not found." };

  const allowed = await canManageChurch(userId, userRole, series.churchId);
  if (!allowed) return { error: "Unauthorised." };

  await prisma.series.delete({ where: { id } });

  return { churchId: series.churchId };
}
