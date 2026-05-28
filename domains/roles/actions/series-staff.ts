"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { seriesPolicy } from "@/domains/roles/policies/series";
import { upsertSeriesStaff, removeSeriesStaff } from "../dal/series-staff";
import {
  AssignSeriesRoleSchema,
  RemoveSeriesStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

async function resolveSeriesChurchId(seriesId: string): Promise<string | null> {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { churchId: true },
  });
  return series?.churchId ?? null;
}

export async function assignSeriesRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = AssignSeriesRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId, role } = parsed.data;
  const churchId = await resolveSeriesChurchId(seriesId);
  if (!churchId) return { error: "Series not found." };

  if (!seriesPolicy.canUpdate(claims, churchId))
    return { error: "Unauthorised." };

  await upsertSeriesStaff(userId, seriesId, role, session.user.id);
  return { success: "Series role assigned." };
}

export async function removeSeriesStaffAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = RemoveSeriesStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, seriesId } = parsed.data;
  const churchId = await resolveSeriesChurchId(seriesId);
  if (!churchId) return { error: "Series not found." };

  if (!seriesPolicy.canUpdate(claims, churchId))
    return { error: "Unauthorised." };

  await removeSeriesStaff(userId, seriesId);
  return { success: "Series staff removed." };
}
