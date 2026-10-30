"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/domains/roles/lib/get-ability";
import {
  cancelEventSchema,
  saveDraftSchema,
  type CancelEventInput,
  type SaveDraftInput,
} from "../validations/event";
import {
  createEvent,
  saveEvent,
  cancelEvent,
  uncancelEvent,
  deleteEvent,
} from "../lifecycle";
import type { ActionResult } from "@/lib/types/action";

// Errors come back to the cancel dialog rather than redirecting, so the
// organiser sees why it was refused.
export async function cancelEventAction(
  id: string,
  data: CancelEventInput
): Promise<ActionResult> {
  if (!(await getSessionUserId())) redirect("/");

  const parsed = cancelEventSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const result = await cancelEvent(id, parsed.data.reason);
  if ("error" in result) return result;

  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  if (!(await getSessionUserId())) redirect("/");

  const result = await uncancelEvent(id);
  if ("error" in result) redirect("/organiser");

  redirect(`/events/${id}`);
}

// Saves a draft, auto-save included. It never writes a published Event: those
// change only through the wizard's explicit save, so half-typed edits don't
// go live.
export async function saveDraftAction(
  id: string | undefined,
  data: SaveDraftInput
): Promise<{ eventId: string } | ActionResult> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const input = {
    ...parsed.data,
    questions: parsed.data.questions ?? [],
    isDraft: true,
  };

  if (!id) {
    const result = await createEvent(input);
    if ("error" in result || "fieldErrors" in result) return result;
    return { eventId: result.id };
  }

  // isDraft: true makes the lifecycle refuse an Event that is already published.
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
