// lib/dal/responses.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { ResponseInput } from "@/lib/validations/questions";

export async function saveResponses(
  eventAttendeeId: string,
  responses: ResponseInput[],
  eventId: string
): Promise<void> {
  if (responses.length === 0) return;

  // Validate that all questionIds belong to this event to prevent cross-event pollution
  const validQuestions = await prisma.eventQuestion.findMany({
    where: { eventId, id: { in: responses.map((r) => r.questionId) } },
    select: { id: true },
  });
  const validIds = new Set(validQuestions.map((q) => q.id));
  const safeResponses = responses.filter(
    (r) =>
      validIds.has(r.questionId) &&
      (r.fileUrl == null || r.fileUrl.startsWith("https://"))
  );
  if (safeResponses.length === 0) return;

  await prisma.$transaction(
    safeResponses.map((r) =>
      prisma.eventAttendeeResponse.upsert({
        where: { eventAttendeeId_questionId: { eventAttendeeId, questionId: r.questionId } },
        create: {
          eventAttendeeId,
          questionId: r.questionId,
          answer: r.answer ?? null,
          fileUrl: r.fileUrl ?? null,
        },
        update: {
          answer: r.answer ?? null,
          fileUrl: r.fileUrl ?? null,
        },
      })
    )
  );
}

export async function getMyResponsesForEvent(
  eventId: string,
  userId: string
): Promise<Record<string, { answer: string | null; fileUrl: string | null }>> {
  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: {
      responses: { select: { questionId: true, answer: true, fileUrl: true } },
    },
  });

  if (!attendee) return {};

  return Object.fromEntries(
    attendee.responses.map((r) => [r.questionId, { answer: r.answer, fileUrl: r.fileUrl }])
  );
}
