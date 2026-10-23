import "server-only";

import type { Db } from "@/lib/db";
import type { ResponseInput } from "./validations";

// Answers that passed checkAnswers: each belongs to one of the Event's
// questions, and every required question has one.
export interface Answers {
  readonly checked: ResponseInput[];
}

const MISSING_REQUIRED =
  "All required questions must be answered before registering.";

// Checked before anything is written, so a registration with a missing answer
// leaves nothing behind. Answers to other Events' questions and non-https
// file links are dropped rather than refused.
export async function checkAnswers(
  db: Db,
  eventId: string,
  responses: ResponseInput[]
): Promise<{ error: string } | Answers> {
  const questions = await db.eventQuestion.findMany({
    where: { eventId },
    select: { id: true, required: true },
  });

  const validIds = new Set(questions.map((q) => q.id));
  const checked = responses.filter(
    (r) =>
      validIds.has(r.questionId) &&
      (r.fileUrl == null || r.fileUrl.startsWith("https://"))
  );

  // Client-side `required` is bypassable; this is the rule.
  const answeredIds = new Set(
    checked
      .filter((r) => (r.answer?.trim() ?? "") !== "" || r.fileUrl != null)
      .map((r) => r.questionId)
  );
  if (questions.some((q) => q.required && !answeredIds.has(q.id))) {
    return { error: MISSING_REQUIRED };
  }
  return { checked };
}

export async function saveAnswers(
  db: Db,
  eventAttendeeId: string,
  { checked }: Answers
): Promise<void> {
  for (const r of checked) {
    const values = { answer: r.answer ?? null, fileUrl: r.fileUrl ?? null };
    await db.eventAttendeeResponse.upsert({
      where: {
        eventAttendeeId_questionId: {
          eventAttendeeId,
          questionId: r.questionId,
        },
      },
      create: { eventAttendeeId, questionId: r.questionId, ...values },
      update: values,
    });
  }
}
