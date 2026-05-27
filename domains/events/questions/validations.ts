// lib/validations/questions.ts
import { z } from "zod";
import { QuestionType } from "@prisma/client";

export { QuestionType };

export const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  FILE_UPLOAD: "File upload",
};

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
  required: boolean;
}

export interface LibraryItem {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(QuestionType),
  label: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1)).default([]),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  libraryItemId: z.string().optional(),
});

export type QuestionInput = z.infer<typeof questionSchema>;

export const responseValueSchema = z.object({
  answer: z.string().nullable().optional(),
  fileUrl: z.url().nullable().optional(),
});

export const responseInputSchema = responseValueSchema.extend({
  questionId: z.string(),
});

export type ResponseInput = z.infer<typeof responseInputSchema>;
