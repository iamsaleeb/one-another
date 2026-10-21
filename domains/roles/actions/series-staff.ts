"use server";

import { prisma } from "@/lib/db";
import { seriesSubject } from "../lib/ability";
import { getAbility, getSessionUserId } from "../lib/get-ability";
import { upsertSeriesStaff, removeSeriesStaff } from "../dal/series-staff";
import {
  AssignSeriesRoleSchema,
  RemoveSeriesStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

// Series staff are managed by whoever may update the Series.
async function authorise(
  seriesId: string
): Promise<{ actorId: string } | { error: string }> {
  const actorId = await getSessionUserId();
  if (!actorId) return { error: "Unauthorised." };
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true, churchId: true },
  });
  if (!series) return { error: "Series not found." };
  const ability = await getAbility();
  if (!ability.can("update", seriesSubject(series)))
    return { error: "Unauthorised." };
  return { actorId };
}

export async function assignSeriesRoleAction(
  input: unknown
): Promise<RoleActionState> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = AssignSeriesRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId, role } = parsed.data;
  const auth = await authorise(seriesId);
  if ("error" in auth) return auth;

  await upsertSeriesStaff(userId, seriesId, role, auth.actorId);
  return { success: "Series role assigned." };
}

export async function removeSeriesStaffAction(
  input: unknown
): Promise<RoleActionState> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = RemoveSeriesStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId } = parsed.data;
  const auth = await authorise(seriesId);
  if ("error" in auth) return auth;

  await removeSeriesStaff(userId, seriesId);
  return { success: "Series staff removed." };
}
