"use server";

import { prisma } from "@/lib/db";
import { eventSubject } from "../lib/ability";
import { getAbility, getSessionUserId } from "../lib/get-ability";
import { upsertEventStaff, removeEventStaff } from "../dal/event-staff";
import {
  AssignEventRoleSchema,
  RemoveEventStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

// Resolves whether the current user may manage staff on this Event.
async function authorise(
  eventId: string
): Promise<{ actorId: string } | { error: string }> {
  const actorId = await getSessionUserId();
  if (!actorId) return { error: "Unauthorised." };
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };
  const ability = await getAbility();
  if (!ability.can("manage_staff", eventSubject(event)))
    return { error: "Unauthorised." };
  return { actorId };
}

export async function assignEventRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const parsed = AssignEventRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, role } = parsed.data;
  const auth = await authorise(eventId);
  if ("error" in auth) return auth;

  await upsertEventStaff(userId, eventId, role, auth.actorId);
  return { success: "Staff role assigned." };
}

export async function removeEventStaffAction(
  input: unknown
): Promise<RoleActionState> {
  const parsed = RemoveEventStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId } = parsed.data;
  const auth = await authorise(eventId);
  if ("error" in auth) return auth;

  await removeEventStaff(userId, eventId);
  return { success: "Staff removed." };
}
