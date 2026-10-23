"use server";

import { redirect } from "next/navigation";
import { getSessionUserId } from "@/domains/roles/lib/get-ability";
import { saveDraftSchema, type SaveDraftInput } from "../validations/event";
import {
  createEvent,
  saveEvent,
  cancelEvent,
  uncancelEvent,
  deleteEvent,
} from "../lifecycle";
import type { ActionResult } from "@/lib/types/action";

export async function cancelEventAction(
  id: string,
  reason: string
): Promise<void> {
  if (!(await getSessionUserId())) redirect("/");

  const result = await cancelEvent(id, reason);
  if ("error" in result) redirect("/organiser");

  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  if (!(await getSessionUserId())) redirect("/");

  const result = await uncancelEvent(id);
  if ("error" in result) redirect("/organiser");

  redirect(`/events/${id}`);
}

// Every wizard save, auto-save included. Whether the Event must be complete is
// the lifecycle's call: a draft may be partial, a published Event may not.
export async function saveDraftAction(
  id: string | undefined,
  data: SaveDraftInput
): Promise<{ eventId: string } | ActionResult> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const input = { ...parsed.data, questions: parsed.data.questions ?? [] };

  if (!id) {
    const result = await createEvent({ ...input, isDraft: true });
    if ("error" in result || "fieldErrors" in result) return result;
    return { eventId: result.id };
  }

  // An omitted isDraft keeps the Event's current state; auto-save on a
  // published Event must not unpublish it.
  const result = await saveEvent(id, input);
  if ("error" in result || "fieldErrors" in result) return result;
  return { eventId: id };
}

// The wizard's explicit save, which publishes by sending isDraft: false.
export async function saveEventEditsAction(
  id: string,
  data: SaveDraftInput
): Promise<{ success: true } | ActionResult> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await saveEvent(id, parsed.data);
  if ("error" in result || "fieldErrors" in result) return result;
  return { success: true };
}

export async function deleteEventAction(id: string): Promise<void> {
  if (!(await getSessionUserId())) redirect("/");

  const result = await deleteEvent(id);
  if ("error" in result) redirect("/organiser");

  redirect("/organiser");
}
