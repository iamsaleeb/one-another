"use server";

import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { upsertSeriesStaff, removeSeriesStaff } from "../dal/series-staff";
import {
  AssignSeriesRoleSchema,
  RemoveSeriesStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

export async function assignSeriesRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const actor = await getActor();
  if (!actor.isAuthenticated) return { error: "Unauthorised." };

  const parsed = AssignSeriesRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId, role } = parsed.data;
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { churchId: true },
  });
  if (!series) return { error: "Series not found." };

  const allowed = await actor.can(Capabilities.SERIES_UPDATE, {
    churchId: series.churchId,
    seriesId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await upsertSeriesStaff(userId, seriesId, role, actor.id);
  return { success: "Series role assigned." };
}

export async function removeSeriesStaffAction(
  input: unknown
): Promise<RoleActionState> {
  const actor = await getActor();
  if (!actor.isAuthenticated) return { error: "Unauthorised." };

  const parsed = RemoveSeriesStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId } = parsed.data;
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { churchId: true },
  });
  if (!series) return { error: "Series not found." };

  const allowed = await actor.can(Capabilities.SERIES_UPDATE, {
    churchId: series.churchId,
    seriesId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await removeSeriesStaff(userId, seriesId);
  return { success: "Series staff removed." };
}
