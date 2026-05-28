"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { eventPolicy } from "@/domains/roles/policies/event";
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
  const session = await auth();
  if (!session) return { error: "Unauthorised." };
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = AssignEventRoleSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId, role } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

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

  const parsed = RemoveEventStaffSchema.safeParse(input);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { userId, eventId } = parsed.data;
  const churchId = await resolveEventChurchId(eventId);
  if (!churchId) return { error: "Event not found." };

  if (!eventPolicy.canManageStaff(claims, eventId, churchId))
    return { error: "Unauthorised." };

  await removeEventStaff(userId, eventId);
  return { success: "Staff removed." };
}
