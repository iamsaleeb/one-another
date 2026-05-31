"use server";

import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { upsertEventStaff, removeEventStaff } from "../dal/event-staff";
import {
  AssignEventRoleSchema,
  RemoveEventStaffSchema,
} from "../validations/roles";
import type { RoleActionState } from "../lib/types";

async function resolveEventChurchId(eventId: string): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { churchId: true },
  });
  return event?.churchId ?? null;
}

export async function assignEventRoleAction(
  input: unknown
): Promise<RoleActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = AssignEventRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, role } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
    churchId,
    eventId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await upsertEventStaff(userId, eventId, role, actor.id);
  return { success: "Staff role assigned." };
}

export async function removeEventStaffAction(
  input: unknown
): Promise<RoleActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = RemoveEventStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

  const allowed = await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
    churchId,
    eventId,
  });
  if (!allowed) return { error: "Unauthorised." };

  await removeEventStaff(userId, eventId);
  return { success: "Staff removed." };
}
