"use server";

import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { registerEventSchema } from "@/lib/validations/event";
import { attendEvent, unattendEvent, registerEvent } from "@/lib/dal/attendance";
import type { ResponseInput } from "@/lib/validations/questions";

export interface AttendEventState {
  error?: string;
}

export interface RegisterEventState {
  success?: boolean;
  error?: string;
}

function invalidateEventCaches(id: string) {
  updateTag("events");
  updateTag(`event-${id}`);
}

function extractResponses(formData: FormData): ResponseInput[] {
  const responses: ResponseInput[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("response_file_") && typeof value === "string" && value) {
      const questionId = key.replace("response_file_", "");
      const existing = responses.find((r) => r.questionId === questionId);
      if (existing) {
        existing.fileUrl = value;
      } else {
        responses.push({ questionId, fileUrl: value, answer: null });
      }
    } else if (key.startsWith("response_") && !key.startsWith("response_file_") && typeof value === "string") {
      const questionId = key.replace("response_", "");
      const existing = responses.find((r) => r.questionId === questionId);
      if (existing) {
        existing.answer = value || null;
      } else {
        responses.push({ questionId, answer: value || null, fileUrl: null });
      }
    }
  }
  return responses;
}

export async function attendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const result = await attendEvent(eventId, session.user.id);
  if ("error" in result && result.error) return { error: result.error };

  invalidateEventCaches(eventId);
  return {};
}

export async function unattendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await unattendEvent(eventId, session.user.id);

  invalidateEventCaches(eventId);
  return {};
}

export async function registerEventAction(
  eventId: string,
  _prevState: RegisterEventState,
  formData: FormData
): Promise<RegisterEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const rawSelectedDays = formData.get("selectedDays");
  let selectedDays: string[] | undefined;
  if (typeof rawSelectedDays === "string" && rawSelectedDays) {
    try {
      const parsed = JSON.parse(rawSelectedDays);
      if (Array.isArray(parsed)) selectedDays = parsed.filter((d): d is string => typeof d === "string");
    } catch {
      // ignore malformed JSON
    }
  }

  const parsed = registerEventSchema.safeParse({
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
    selectedDays,
  });

  if (!parsed.success) return { error: "Invalid form data." };

  const responses = extractResponses(formData);

  const result = await registerEvent(eventId, session.user.id, {
    phone: parsed.data.phone,
    notes: parsed.data.notes,
    selectedDays: parsed.data.selectedDays,
    responses,
  });

  if ("error" in result) return { error: result.error };

  invalidateEventCaches(eventId);
  return { success: true };
}
