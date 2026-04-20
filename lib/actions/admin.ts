"use server";

import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAdminForChurch } from "@/lib/permissions";
import { addOrganiserSchema, removeOrganiserSchema } from "@/lib/validations/admin";

export interface AdminActionState {
  error?: string;
  success?: string;
}

export async function addOrganiserToChurchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ADMIN) return { error: "Unauthorised." };

  const parsed = addOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { churchId, email } = parsed.data;

  const allowed = await isAdminForChurch(session.user.id, churchId);
  if (!allowed) return { error: "You are not an admin of this church." };

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!targetUser) return { error: "No account found with that email." };
  if (targetUser.role === UserRole.ADMIN) return { error: "This user is an admin and cannot be added as an organiser." };

  const existing = await prisma.churchOrganiser.findUnique({
    where: { userId_churchId: { userId: targetUser.id, churchId } },
    select: { userId: true },
  });
  if (existing) return { success: "User is already an organiser for this church." };

  await prisma.$transaction(async (tx) => {
    if (targetUser.role === UserRole.ATTENDEE) {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { role: UserRole.ORGANISER },
      });
    }
    await tx.churchOrganiser.create({
      data: { userId: targetUser.id, churchId },
    });
  });

  updateTag("churches");
  return { success: "Organiser added successfully." };
}

export async function removeOrganiserFromChurchAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ADMIN) return { error: "Unauthorised." };

  const parsed = removeOrganiserSchema.safeParse({
    churchId: formData.get("churchId"),
    targetUserId: formData.get("targetUserId"),
  });
  if (!parsed.success) return { error: "Missing required fields." };

  const { churchId, targetUserId } = parsed.data;

  const allowed = await isAdminForChurch(session.user.id, churchId);
  if (!allowed) return { error: "You are not an admin of this church." };

  await prisma.churchOrganiser.delete({
    where: { userId_churchId: { userId: targetUserId, churchId } },
  });

  const remaining = await prisma.churchOrganiser.count({
    where: { userId: targetUserId },
  });
  if (remaining === 0) {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: UserRole.ATTENDEE },
    });
  }

  updateTag("churches");
  return { success: "Organiser removed." };
}
