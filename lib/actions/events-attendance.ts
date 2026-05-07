"use server";

import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { type RegistrationFormValues } from "@/lib/validations/event";
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

  const result = await unattendEvent(eventId, session.user.id);
  if ("error" in result) return { error: result.error };

  invalidateEventCaches(eventId);
  return {};
}

export async function registerEventAction(
  eventId: string,
  data: RegistrationFormValues
): Promise<RegisterEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const responses: ResponseInput[] = Object.entries(data.responses ?? {}).map(
    ([questionId, { answer, fileUrl }]) => ({
      questionId,
      answer: answer ?? null,
      fileUrl: fileUrl ?? null,
    })
  );

  const result = await registerEvent(eventId, session.user.id, {
    phone: data.phone,
    notes: data.notes,
    selectedDays: data.selectedDays,
    responses,
  });

  if ("error" in result) return { error: result.error };

  invalidateEventCaches(eventId);
  return { success: true };
}
