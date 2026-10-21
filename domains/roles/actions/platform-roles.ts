"use server";

import { z } from "zod";
import { getAbility, getSessionUserId } from "../lib/get-ability";
import { upsertPlatformRole, removePlatformRole } from "../dal/platform-roles";
import { AssignPlatformRoleSchema } from "../validations/roles";
import type { RoleActionState } from "../lib/types";

async function isPlatformAdmin(): Promise<boolean> {
  return (await getAbility()).can("manage", "all");
}

export async function assignPlatformRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const actorId = await getSessionUserId();
  if (!actorId || !(await isPlatformAdmin())) return { error: "Unauthorised." };

  const parsed = AssignPlatformRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, role } = parsed.data;
  await upsertPlatformRole(userId, role, actorId);
  return { success: "Platform role assigned." };
}

export async function removePlatformRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const actorId = await getSessionUserId();
  if (!actorId || !(await isPlatformAdmin())) return { error: "Unauthorised." };

  const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  await removePlatformRole(parsed.data.userId, "PLATFORM_ADMIN");
  return { success: "Platform role removed." };
}
