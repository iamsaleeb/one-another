"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export interface FollowChurchState {
  error?: string;
}

export async function followChurchAction(
  churchId: string
): Promise<FollowChurchState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.churchFollower.create({
      data: { churchId, userId: session.user.id },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {};
    }
    throw err;
  }

  updateTag(`church-${churchId}`);
  updateTag(`user-follow-church-${session.user.id}-${churchId}`);
  return {};
}

export async function unfollowChurchAction(
  churchId: string
): Promise<FollowChurchState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.churchFollower.delete({
      where: { churchId_userId: { churchId, userId: session.user.id } },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return {};
    }
    throw err;
  }

  updateTag(`church-${churchId}`);
  updateTag(`user-follow-church-${session.user.id}-${churchId}`);
  return {};
}
