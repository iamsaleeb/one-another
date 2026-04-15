"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export interface FollowChurchState {
  error?: string;
}

export async function followChurchAction(churchId: string): Promise<FollowChurchState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await prisma.churchFollower.create({
    data: { churchId, userId: session.user.id },
  });

  updateTag(`church-${churchId}`);
  return {};
}

export async function unfollowChurchAction(churchId: string): Promise<FollowChurchState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await prisma.churchFollower.delete({
    where: { churchId_userId: { churchId, userId: session.user.id } },
  });

  updateTag(`church-${churchId}`);
  return {};
}
