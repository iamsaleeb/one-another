"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/domains/roles/lib/session";
import {
  createEventSchema,
  saveDraftSchema,
  type CreateEventInput,
  type SaveDraftInput,
} from "../validations/event";
import {
  createEvent,
  updateEvent,
  cancelEvent,
  uncancelEvent,
  publishEvent,
  unpublishEvent,
  deleteEvent,
} from "../dal/events";
import type { ActionResult } from "@/lib/types/action";
import { invalidateEventCaches, invalidateEventUpdate } from "../cache";

export async function createEventAction(
  data: CreateEventInput
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createEvent(parsed.data, actor.id, actor);
  if ("error" in result || "fieldErrors" in result) return result;

  invalidateEventCaches(result.id, result.churchId, result.seriesId, {
    broadcastToChurchList: true,
  });
  redirect(
    result.isDraft
      ? "/organiser"
      : result.seriesId
        ? `/series/${result.seriesId}`
        : "/my-events"
  );
}

export async function updateEventAction(
  id: string,
  data: CreateEventInput
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateEvent(id, parsed.data, actor.id, actor);
  if ("error" in result) redirect("/organiser");
  if ("fieldErrors" in result) return result;

  invalidateEventUpdate(id, result);
  redirect(`/events/${id}`);
}

export async function cancelEventAction(
  id: string,
  reason: string
): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const result = await cancelEvent(id, reason, actor.id, actor);
  if ("error" in result) redirect("/organiser");

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const result = await uncancelEvent(id, actor.id, actor);
  if ("error" in result) redirect("/organiser");

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const result = await publishEvent(id, actor.id, actor);
  if ("error" in result) return result;

  invalidateEventCaches(id, result.churchId, result.seriesId, {
    broadcastToChurchList: true,
  });
  redirect(`/events/${id}`);
}

export async function unpublishEventAction(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const result = await unpublishEvent(id, actor.id, actor);
  if ("error" in result) return result;

  invalidateEventCaches(id, result.churchId, result.seriesId, {
    broadcastToChurchList: true,
  });
  redirect(`/events/${id}`);
}

export async function saveDraftAction(
  id: string | undefined,
  data: SaveDraftInput
): Promise<{ eventId: string } | ActionResult> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const dataWithDefaults = {
    ...parsed.data,
    questions: parsed.data.questions ?? [],
  };

  if (!id) {
    const result = await createEvent(
      { ...dataWithDefaults, isDraft: true },
      actor.id,
      actor
    );
    if ("error" in result || "fieldErrors" in result) return result;
    invalidateEventCaches(result.id, result.churchId, result.seriesId ?? null);
    return { eventId: result.id };
  } else {
    const result = await updateEvent(
      id,
      { ...dataWithDefaults, isDraft: dataWithDefaults.isDraft ?? true },
      actor.id,
      actor
    );
    if ("error" in result || "fieldErrors" in result) return result;
    invalidateEventUpdate(id, result);
    return { eventId: id };
  }
}

export async function saveEventAction(
  id: string,
  data: CreateEventInput
): Promise<{ success: true } | ActionResult> {
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateEvent(id, parsed.data, actor.id, actor);
  if ("error" in result || "fieldErrors" in result) return result;

  invalidateEventUpdate(id, result);

  return { success: true };
}

export async function deleteEventAction(id: string): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const result = await deleteEvent(id, actor.id, actor);
  if ("error" in result) redirect("/organiser");

  invalidateEventCaches(id, result.churchId, result.seriesId, {
    broadcastToChurchList: true,
  });
  redirect("/organiser");
}
