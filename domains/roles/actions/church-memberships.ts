"use server";

import { churchSubject } from "../lib/ability";
import { getAbility, getSessionUserId } from "../lib/get-ability";
import {
  upsertChurchMembership,
  removeChurchMembership,
} from "../dal/church-memberships";
import {
  AssignChurchRoleSchema,
  RemoveChurchMembershipSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

export async function assignChurchRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const actorId = await getSessionUserId();
  if (!actorId) return { error: "Unauthorised." };

  const parsed = AssignChurchRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, churchId, role } = parsed.data;
  const ability = await getAbility();
  if (!ability.can("manage_members", churchSubject({ id: churchId })))
    return { error: "Unauthorised." };

  await upsertChurchMembership(userId, churchId, role, actorId);
  return { success: "Role assigned." };
}

export async function removeChurchMembershipAction(
  input: unknown
): Promise<RoleActionState> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = RemoveChurchMembershipSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, churchId } = parsed.data;
  const ability = await getAbility();
  if (!ability.can("manage_members", churchSubject({ id: churchId })))
    return { error: "Unauthorised." };

  await removeChurchMembership(userId, churchId);
  return { success: "Membership removed." };
}
