"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { churchPolicy } from "@/domains/roles/policies/church";
import {
  getChurchMembership,
  upsertChurchMembership,
  removeChurchMembership,
} from "@/domains/roles/dal/church-memberships";
import { ChurchRole } from "@prisma/client";
import {
  addOrganiserSchema,
  removeOrganiserSchema,
} from "@/domains/churches/validations/churches";

export interface AdminActionState {
  error?: string;
  success?: string;
}

export async function addOrganiserToChurchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = addOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { churchId, email } = parsed.data;

  if (!(await churchPolicy.canManageMembers(actor, churchId)))
    return { error: "Unauthorised." };

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) return { error: "No account found with that email." };

  const existing = await getChurchMembership(targetUser.id, churchId);
  if (
    existing?.role === ChurchRole.CHURCH_ADMIN ||
    existing?.role === ChurchRole.EVENT_MANAGER
  ) {
    return { success: "User is already an organiser for this church." };
  }

  await upsertChurchMembership(
    targetUser.id,
    churchId,
    ChurchRole.EVENT_MANAGER,
    actor.id
  );

  updateTag("churches");
  return { success: "Organiser added successfully." };
}

export async function removeOrganiserFromChurchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = removeOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    targetUserId: formData.get("targetUserId"),
  });
  if (!parsed.success) return { error: "Missing required fields." };

  const { churchId, targetUserId } = parsed.data;

  if (!(await churchPolicy.canManageMembers(actor, churchId)))
    return { error: "Unauthorised." };

  await removeChurchMembership(targetUserId, churchId);

  updateTag("churches");
  return { success: "Organiser removed." };
}
