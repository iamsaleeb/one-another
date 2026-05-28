"use server";

import { auth } from "@/auth";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { churchPolicy } from "@/domains/roles/policies/church";
import {
  upsertChurchMembership,
  removeChurchMembership,
} from "../dal/church-memberships";
import {
  AssignChurchRoleSchema,
  RemoveChurchMembershipSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

export type { RoleActionState };

export async function assignChurchRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = AssignChurchRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, churchId, role } = parsed.data;
  if (!churchPolicy.canManageMembers(claims, churchId))
    return { error: "Unauthorised." };

  await upsertChurchMembership(userId, churchId, role, session.user.id);
  return { success: "Role assigned." };
}

export async function removeChurchMembershipAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = RemoveChurchMembershipSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, churchId } = parsed.data;
  if (!churchPolicy.canManageMembers(claims, churchId))
    return { error: "Unauthorised." };

  await removeChurchMembership(userId, churchId);
  return { success: "Membership removed." };
}
