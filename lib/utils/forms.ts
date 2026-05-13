import type { ResponseInput } from "@/lib/validations/questions";

export function extractResponses(formData: FormData): ResponseInput[] {
  const map = new Map<string, ResponseInput>();
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key.startsWith("response_file_")) {
      const questionId = key.slice("response_file_".length);
      const entry = map.get(questionId) ?? {
        questionId,
        answer: null,
        fileUrl: null,
      };
      map.set(questionId, { ...entry, fileUrl: value || null });
    } else if (key.startsWith("response_")) {
      const questionId = key.slice("response_".length);
      const entry = map.get(questionId) ?? {
        questionId,
        answer: null,
        fileUrl: null,
      };
      map.set(questionId, { ...entry, answer: value || null });
    }
  }
  return Array.from(map.values());
}
