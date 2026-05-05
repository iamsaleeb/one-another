// lib/dal/questions.ts
import "server-only";

import { prisma } from "@/lib/db";
import type { QuestionInput } from "@/lib/validations/questions";

export async function syncEventQuestions(
  eventId: string,
  questions: QuestionInput[],
  createdById: string
): Promise<void> {
  const responseCount = await prisma.eventAttendeeResponse.count({
    where: { question: { eventId } },
  });

  // Once responses exist, questions are locked — no sync
  if (responseCount > 0) return;

  await prisma.$transaction([
    prisma.eventQuestion.deleteMany({ where: { eventId } }),
    prisma.eventQuestion.createMany({
      data: questions.map((q, i) => ({
        eventId,
        type: q.type,
        label: q.label,
        options: q.options,
        required: q.required,
        order: i,
        libraryItemId: q.libraryItemId ?? null,
      })),
    }),
  ]);

  // Upsert library items for each unique (label, type) pair
  const seen = new Set<string>();
  for (const q of questions) {
    const key = `${q.type}::${q.label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.questionLibraryItem.upsert({
      where: { createdById_label_type: { createdById, label: q.label, type: q.type } },
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
