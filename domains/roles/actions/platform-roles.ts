"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { upsertPlatformRole, removePlatformRole } from "../dal/platform-roles";
import { AssignPlatformRoleSchema } from "../validations/roles";
import type { RoleActionState } from "../lib/types";

export async function assignPlatformRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };
  if (!claims.isPlatformAdmin) return { error: "Unauthorised." };

  const parsed = AssignPlatformRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, role } = parsed.data;
  await upsertPlatformRole(userId, role, session.user.id);
  return { success: "Platform role assigned." };
}

export async function removePlatformRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };
  if (!claims.isPlatformAdmin) return { error: "Unauthorised." };

  const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  await removePlatformRole(parsed.data.userId, "PLATFORM_ADMIN");
  return { success: "Platform role removed." };
}
