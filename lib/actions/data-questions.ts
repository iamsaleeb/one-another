// lib/actions/data-questions.ts
"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

export async function getEventQuestions(eventId: string) {
  cacheTag(`event-questions-${eventId}`);
  cacheLife("minutes");
  return prisma.eventQuestion.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      options: true,
      required: true,
      order: true,
      libraryItemId: true,
    },
  });
}

export async function getEventResponses(eventId: string) {
  cacheTag(`event-questions-${eventId}`, `event-${eventId}`);
  cacheLife("minutes");

  const questions = await prisma.eventQuestion.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, label: true, type: true },
  });

  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
      responses: {
        select: { questionId: true, answer: true, fileUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { questions, attendees };
}
