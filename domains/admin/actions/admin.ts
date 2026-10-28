"use server";

import { prisma } from "@/lib/db";
import { churchSubject } from "@/domains/roles/lib/ability";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
import { grant, MANAGE_HELPERS, removeGrant } from "@/domains/roles/access";
import {
  addOrganiserSchema,
  removeOrganiserSchema,
  type AddOrganiserInput,
  type RemoveOrganiserInput,
} from "@/domains/churches/validations/churches";

export interface AdminActionState {
  error?: string;
  success?: string;
}

export async function addOrganiserToChurchAction(
  data: AddOrganiserInput
): Promise<AdminActionState> {
  const actorId = await getSessionUserId();
  if (!actorId) return { error: "Unauthorised." };

  const parsed = addOrganiserSchema.safeParse(data);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { churchId, email } = parsed.data;

  // Checked before the email lookup too, so nobody else can probe which
  // emails have accounts.
  const ability = await getAbility();
  if (!ability.can(MANAGE_HELPERS.CHURCH, churchSubject({ id: churchId })))
    return { error: "Unauthorised." };

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!targetUser) return { error: "No account found with that email." };

  const result = await grant(
    { type: "CHURCH", id: churchId },
    targetUser.id,
    "EVENT_MANAGER"
  );
  if ("error" in result) return result;
  if (!result.granted)
    return { success: "User is already an organiser for this church." };
  return { success: "Organiser added successfully." };
}

export async function removeOrganiserFromChurchAction(
  data: RemoveOrganiserInput
): Promise<AdminActionState> {
  const parsed = removeOrganiserSchema.safeParse(data);
  if (!parsed.success) return { error: "Missing required fields." };

  const { churchId, targetUserId } = parsed.data;

  const result = await removeGrant(
    { type: "CHURCH", id: churchId },
    targetUserId
  );
  if ("error" in result) return result;
  return { success: "Organiser removed." };
}
