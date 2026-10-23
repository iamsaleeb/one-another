"use server";

import {
  registrationFormSchema,
  type RegistrationFormValues,
} from "../validations/event";
import { attendEvent, unattendEvent } from "../lifecycle";
import type { ResponseInput } from "../questions/validations";

export interface AttendEventState {
  error?: string;
}

export interface RegisterEventState {
  success?: boolean;
  error?: string;
}

export async function attendEventAction(
  eventId: string
): Promise<AttendEventState> {
  const result = await attendEvent(eventId);
  return "error" in result ? { error: result.error } : {};
}

export async function unattendEventAction(
  eventId: string
): Promise<AttendEventState> {
  const result = await unattendEvent(eventId);
  return "error" in result ? { error: result.error } : {};
}

export async function registerEventAction(
  eventId: string,
  data: RegistrationFormValues
): Promise<RegisterEventState> {
  const parsed = registrationFormSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid registration data." };

  const responses: ResponseInput[] = Object.entries(
    parsed.data.responses ?? {}
  ).map(([questionId, { answer, fileUrl }]) => ({
    questionId,
    answer: answer?.trim() || null,
    fileUrl: fileUrl ?? null,
  }));

  const result = await attendEvent(eventId, {
    phone: parsed.data.phone,
    notes: parsed.data.notes,
    selectedDays: parsed.data.selectedDays,
    responses,
  });
  return "error" in result ? { error: result.error } : { success: true };
}
