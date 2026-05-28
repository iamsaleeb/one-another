"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { eventPolicy } from "@/domains/roles/policies/event";
import { upsertEventStaff, removeEventStaff } from "../dal/event-staff";
import {
  AssignEventRoleSchema,
  RemoveEventStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "./church-memberships";

const AssignEventRoleWithChurchSchema = AssignEventRoleSchema.extend({
  churchId: z.string().min(1),
});

export async function assignEventRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = AssignEventRoleWithChurchSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, role, churchId } = parsed.data;
  if (!eventPolicy.canManageStaff(claims, eventId, churchId))
    return { error: "Unauthorised." };

  await upsertEventStaff(userId, eventId, role, session.user.id);
  return { success: "Staff role assigned." };
}

export async function removeEventStaffAction(
  input: unknown
): Promise<RoleActionState> {
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = RemoveEventStaffSchema.extend({
    churchId: z.string().min(1),
  }).safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, churchId } = parsed.data;
  if (!eventPolicy.canManageStaff(claims, eventId, churchId))
    return { error: "Unauthorised." };

  await removeEventStaff(userId, eventId);
  return { success: "Staff removed." };
}
