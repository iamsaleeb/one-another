"use server";

import { updateTag } from "next/cache";
import { auth } from "@/auth";
import {
  registrationFormSchema,
  type RegistrationFormValues,
} from "@/lib/validations/event";
import {
  attendEvent,
  unattendEvent,
  registerEvent,
} from "@/lib/dal/attendance";
import type { ResponseInput } from "@/lib/validations/questions";

export interface AttendEventState {
  error?: string;
}

export interface RegisterEventState {
  success?: boolean;
  error?: string;
}

function invalidateAttendanceCaches(id: string, userId?: string) {
  updateTag("events");
  updateTag(`event-${id}`);
  if (userId) {
    updateTag(`user-attendance-${userId}-${id}`);
  }
}

export async function attendEventAction(
  eventId: string
): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const result = await attendEvent(eventId, session.user.id);
  if ("error" in result) return { error: result.error };

  invalidateAttendanceCaches(eventId, session.user.id);
  return {};
}

export async function unattendEventAction(
  eventId: string
): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const result = await unattendEvent(eventId, session.user.id);
  if ("error" in result) return { error: result.error };

  invalidateAttendanceCaches(eventId, session.user.id);
  return {};
}

export async function registerEventAction(
  eventId: string,
  data: RegistrationFormValues
): Promise<RegisterEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const parsed = registrationFormSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid registration data." };

  const responses: ResponseInput[] = Object.entries(
    parsed.data.responses ?? {}
  ).map(([questionId, { answer, fileUrl }]) => ({
    questionId,
    answer: answer?.trim() || null,
    fileUrl: fileUrl ?? null,
  }));

  const result = await registerEvent(eventId, session.user.id, {
    phone: parsed.data.phone,
    notes: parsed.data.notes,
    selectedDays: parsed.data.selectedDays,
    responses,
  });

  if ("error" in result) return { error: result.error };

  invalidateAttendanceCaches(eventId, session.user.id);
  return { success: true };
}
