import "server-only";

import { accessibleBy } from "@casl/prisma";
import { prisma } from "@/lib/db";
import {
  seriesSubject,
  type Action,
  type AppAbility,
} from "@/domains/roles/lib/ability";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
import type { CreateSeriesInput } from "../validations/series";

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

// Trusted callers with no session (cron, workers) pass `systemAbility()`.
export interface WriteOptions {
  ability?: AppAbility;
}

function scopedTo(ability: AppAbility, action: Action, id: string) {
  return { id, AND: [accessibleBy(ability, action).ofType("Series")] };
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
  const exists = await prisma.series.count({ where: { id } });
  return { error: exists ? "Unauthorised." : "Series not found." };
}

export async function createSeries(
  data: CreateSeriesInput,
  opts?: WriteOptions
): Promise<DalError | { id: string; churchId: string }> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorised." };
  const ability = opts?.ability ?? (await getAbility());

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
  const ability = opts?.ability ?? (await getAbility());
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

  // Moving a Series to another Church needs authority to create one there.
  if (
    churchId !== existing.churchId &&
    !ability.can("create", seriesSubject({ churchId }))
  )
    return { error: "Unauthorised." };

  await prisma.series.update({
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

  return { oldChurchId: existing.churchId, newChurchId: churchId };
}

export async function deleteSeries(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | { churchId: string }> {
  const ability = opts?.ability ?? (await getAbility());
  const series = await findForAction(ability, "delete", id);
  if ("error" in series) return series;

  await prisma.series.delete({ where: scopedTo(ability, "delete", id) });

  return { churchId: series.churchId };
}
