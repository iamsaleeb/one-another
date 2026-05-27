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

export async function hasEventResponses(eventId: string): Promise<boolean> {
  cacheTag(`event-questions-${eventId}`);
  cacheLife("minutes");
  const count = await prisma.eventAttendeeResponse.count({
    where: { question: { eventId } },
  });
  return count > 0;
}

export async function getMyResponses(
  eventId: string,
  userId: string
): Promise<Record<string, { answer: string | null; fileUrl: string | null }>> {
  cacheTag(`event-questions-${eventId}`, `user-responses-${eventId}-${userId}`);
  cacheLife("minutes");

  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: {
      responses: { select: { questionId: true, answer: true, fileUrl: true } },
    },
  });

  if (!attendee) return {};

  return Object.fromEntries(
    attendee.responses.map((r) => [
      r.questionId,
      { answer: r.answer, fileUrl: r.fileUrl },
    ])
  );
}
