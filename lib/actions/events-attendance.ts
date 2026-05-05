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

export function extractResponses(formData: FormData): ResponseInput[] {
  const map = new Map<string, ResponseInput>();
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (key.startsWith("response_file_")) {
      const questionId = key.slice("response_file_".length);
      const entry = map.get(questionId) ?? { questionId, answer: null, fileUrl: null };
      map.set(questionId, { ...entry, fileUrl: value || null });
    } else if (key.startsWith("response_")) {
      const questionId = key.slice("response_".length);
      const entry = map.get(questionId) ?? { questionId, answer: null, fileUrl: null };
      map.set(questionId, { ...entry, answer: value || null });
    }
  }
  return Array.from(map.values());
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
