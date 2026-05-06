// lib/dal/responses.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { ResponseInput } from "@/lib/validations/questions";

export async function saveResponses(
  eventAttendeeId: string,
  responses: ResponseInput[],
  eventId: string
): Promise<void> {
  // Fetch all questions for this event to validate IDs and enforce required rules
  const eventQuestions = await prisma.eventQuestion.findMany({
    where: { eventId },
    select: { id: true, required: true },
  });

  if (eventQuestions.length === 0) return;

  const validIds = new Set(eventQuestions.map((q) => q.id));
  const safeResponses = responses.filter(
    (r) =>
      validIds.has(r.questionId) &&
      (r.fileUrl == null || r.fileUrl.startsWith("https://"))
  );

  // Enforce required questions server-side — client HTML required is bypassable
  const answeredIds = new Set(
    safeResponses
      .filter((r) => (r.answer?.trim() ?? "") !== "" || r.fileUrl != null)
      .map((r) => r.questionId)
  );
  const missingRequired = eventQuestions.find(
    (q) => q.required && !answeredIds.has(q.id)
  );
  if (missingRequired) {
    throw new Error("All required questions must be answered before registering.");
  }

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
