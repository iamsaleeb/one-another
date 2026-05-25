"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

export interface SaveEventState {
  error?: string;
}

export async function saveEventAction(
  eventId: string
): Promise<SaveEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };
  const userId = session.user.id;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { isDraft: true },
  });
  if (!event || event.isDraft) return { error: "Event not found." };

  try {
    await prisma.savedEvent.create({ data: { userId, eventId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {};
    }
    throw err;
  }

  updateTag(`saved-events-${userId}`);
  return {};
}

export async function unsaveEventAction(
  eventId: string
): Promise<SaveEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };
  const userId = session.user.id;

  try {
    await prisma.savedEvent.delete({
      where: { userId_eventId: { userId, eventId } },
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

  updateTag(`saved-events-${userId}`);
  return {};
}
