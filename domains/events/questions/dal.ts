// lib/dal/questions.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { QuestionInput } from "./validations";

export async function syncEventQuestions(
  eventId: string,
  questions: QuestionInput[],
  // The user whose question library learns these questions. `null` for a
  // trusted caller with no user, which syncs the Event only.
  createdById: string | null
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const responseCount = await tx.eventAttendeeResponse.count({
      where: { question: { eventId } },
    });

    // Questions are locked once responses exist — skip sync, preserve existing questions
    if (responseCount > 0) return;

    await tx.eventQuestion.deleteMany({ where: { eventId } });
    await tx.eventQuestion.createMany({
      data: questions.map((q, i) => ({
        eventId,
        type: q.type,
        label: q.label,
        options: q.options,
        required: q.required,
        order: i,
        libraryItemId: q.libraryItemId ?? null,
      })),
    });
  });

  if (!createdById) return;

  // Upsert library items for each unique (label, type) pair
  const seen = new Set<string>();
  for (const q of questions) {
    const key = `${q.type}::${q.label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.questionLibraryItem.upsert({
      where: {
        createdById_label_type: { createdById, label: q.label, type: q.type },
      },
      create: { createdById, type: q.type, label: q.label, options: q.options },
      update: { options: q.options },
    });
  }
}

export async function getQuestionLibraryForUser(userId: string) {
  return prisma.questionLibraryItem.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, label: true, options: true },
  });
}
