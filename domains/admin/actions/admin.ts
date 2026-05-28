"use server";

import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sessionToClaims } from "@/domains/roles/lib/session";
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
  const session = await auth();
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = addOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { churchId, email } = parsed.data;

  if (!churchPolicy.canManageMembers(claims, churchId))
    return { error: "Unauthorised." };

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) return { error: "No account found with that email." };

  const existing = await getChurchMembership(targetUser.id, churchId);
  if (existing) return { success: "User is already a member of this church." };

  await upsertChurchMembership(
    targetUser.id,
    churchId,
    ChurchRole.EVENT_MANAGER,
    session!.user.id
  );

  updateTag("churches");
  return { success: "Organiser added successfully." };
}

export async function removeOrganiserFromChurchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await auth();
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = removeOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    targetUserId: formData.get("targetUserId"),
  });
  if (!parsed.success) return { error: "Missing required fields." };

  const { churchId, targetUserId } = parsed.data;

  if (!churchPolicy.canManageMembers(claims, churchId))
    return { error: "Unauthorised." };

  await removeChurchMembership(targetUserId, churchId);

  updateTag("churches");
  return { success: "Organiser removed." };
}
