import "server-only";

import { prisma } from "@/lib/db";
import {
  seriesSubject,
  type Action,
  type AppAbility,
} from "@/domains/roles/lib/ability";
import {
  missingOrForbidden,
  resolveWrite,
  scopedTo as scopedToType,
  type WriteOptions,
} from "@/domains/roles/lib/scoped-writes";
import { seriesDeleted, seriesMovedChurch } from "@/domains/events/lifecycle";
import type { CreateSeriesInput } from "../validations/series";

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

function scopedTo(ability: AppAbility, action: Action, id: string) {
  return scopedToType(ability, action, "Series", id);
}

async function findForAction(
  ability: AppAbility,
  action: Action,
  id: string
): Promise<{ churchId: string } | { error: string }> {
  const series = await prisma.series.findFirst({
    where: scopedTo(ability, action, id),
    select: { churchId: true },
  });
  if (series) return series;
  return missingOrForbidden(
    await prisma.series.count({ where: { id } }),
    "Series"
  );
}

export async function createSeries(
  data: CreateSeriesInput,
  opts?: WriteOptions
): Promise<DalError | { id: string; churchId: string }> {
  const { ability, userId } = await resolveWrite(opts);

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

  if (!ability.can("create", seriesSubject({ churchId })))
    return { error: "Unauthorised." };

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
  opts?: WriteOptions
): Promise<DalError | { oldChurchId: string; newChurchId: string }> {
  const { ability } = await resolveWrite(opts);
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

  const existing = await findForAction(ability, "update", id);
  if ("error" in existing) return existing;

  // Moving a Series needs authority to create one in the destination Church,
  // and to still edit it once it lands there.
  if (
    churchId !== existing.churchId &&
    !(
      ability.can("create", seriesSubject({ churchId })) &&
      ability.can("update", seriesSubject({ id, churchId }))
    )
  )
    return { error: "Unauthorised." };

  const afterCommit = await prisma.$transaction(async (tx) => {
    await tx.series.update({
      where: scopedTo(ability, "update", id),
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
    if (churchId !== existing.churchId)
      return seriesMovedChurch(tx, id, churchId);
  });
  afterCommit?.();

  return { oldChurchId: existing.churchId, newChurchId: churchId };
}

export async function deleteSeries(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | { churchId: string }> {
  const { ability } = await resolveWrite(opts);
  const series = await findForAction(ability, "delete", id);
  if ("error" in series) return series;

  const afterCommit = await prisma.$transaction(async (tx) => {
    const done = await seriesDeleted(tx, id);
    await tx.series.delete({ where: scopedTo(ability, "delete", id) });
    return done;
  });
  afterCommit();

  return { churchId: series.churchId };
}
