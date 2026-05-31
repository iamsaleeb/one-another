import "server-only";

import { prisma } from "@/lib/db";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import type { Actor } from "@/domains/roles/lib/can";
import type { CreateSeriesInput } from "../validations/series";

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

export async function createSeries(
  data: CreateSeriesInput,
  userId: string,
  actor: Actor
): Promise<DalError | { id: string; churchId: string }> {
  const {
    name,
    description,
    cadence,
    location,
    host,
    tag,
    churchId,
    photoUrl,
  } = data;

  const allowed = await can(actor, Capabilities.SERIES_CREATE, { churchId });
  if (!allowed) return { error: "Unauthorised." };

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
  actor: Actor
): Promise<DalError | { oldChurchId: string; newChurchId: string }> {
  const {
    name,
    description,
    cadence,
    location,
    host,
    tag,
    churchId,
    photoUrl,
  } = data;

  const existing = await prisma.series.findUnique({
    where: { id },
    select: { churchId: true },
  });
  if (!existing) return { error: "Series not found." };

  const allowedOriginal = await can(actor, Capabilities.SERIES_UPDATE, {
    churchId: existing.churchId,
    seriesId: id,
  });
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await can(actor, Capabilities.SERIES_UPDATE, { churchId });
    if (!allowedNew) return { error: "Unauthorised." };
  }

  await prisma.series.update({
    where: { id },
    data: {
      name,
      description,
      cadence,
      location,
      host,
      tag,
      churchId,
      photoUrl: photoUrl ?? null,
    },
  });

  return { oldChurchId: existing.churchId, newChurchId: churchId };
}

export async function deleteSeries(
  id: string,
  userId: string,
  claims: RoleClaims
): Promise<{ error: string } | { churchId: string }> {
  const series = await prisma.series.findUnique({
    where: { id },
    select: { churchId: true },
  });
  if (!series) return { error: "Series not found." };

  const allowed = can(claims, Capabilities.SERIES_DELETE, {
    scope: "CHURCH",
    churchId: series.churchId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await prisma.series.delete({ where: { id } });

  return { churchId: series.churchId };
}
