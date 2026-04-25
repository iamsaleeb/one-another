"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, saveDraftSchema, type CreateEventInput, type SaveDraftInput } from "@/lib/validations/event";
import { createEvent, updateEvent, cancelEvent, uncancelEvent, publishEvent, unpublishEvent, deleteEvent } from "@/lib/dal/events";
import type { ActionResult } from "@/lib/actions/auth";
import { broadcastEventChange, invalidateEventFields } from "@/lib/actions/_cache";

export async function createEventAction(data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createEvent(parsed.data, session.user.id, session.user.role);
  if ("error" in result || "fieldErrors" in result) return result;

  broadcastEventChange(result.id, result.churchId, result.seriesId);
  redirect(result.isDraft ? "/organiser" : result.seriesId ? `/series/${result.seriesId}` : "/my-events");
}

export async function updateEventAction(id: string, data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateEvent(id, parsed.data, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");
  if ("fieldErrors" in result) return result;

  invalidateEventFields(id, result.oldChurchId);
  if (result.newChurchId !== result.oldChurchId) updateTag(`church-${result.newChurchId}`);
  if (result.affectedSeriesIds.length > 0) {
    updateTag("series");
    result.affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
  redirect(`/events/${id}`);
}

export async function cancelEventAction(id: string, reason: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const result = await cancelEvent(id, reason, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");

  invalidateEventFields(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const result = await uncancelEvent(id, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");

  invalidateEventFields(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const result = await publishEvent(id, session.user.id, session.user.role);
  if ("error" in result) return result;

  broadcastEventChange(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function unpublishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const result = await unpublishEvent(id, session.user.id, session.user.role);
  if ("error" in result) return result;

  broadcastEventChange(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function saveDraftAction(
  id: string | undefined,
  data: SaveDraftInput
): Promise<{ eventId: string } | { error: string }> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid data." };

  if (!id) {
    const result = await createEvent({ ...parsed.data, isDraft: true }, session.user.id, session.user.role);
    if ("error" in result || "fieldErrors" in result) {
      return { error: ("error" in result ? result.error : undefined) ?? "Failed to save draft." };
    }
    invalidateEventFields(result.id, result.churchId, result.seriesId ?? null);
    return { eventId: result.id };
  } else {
    const result = await updateEvent(id, { ...parsed.data, isDraft: true }, session.user.id, session.user.role);
    if ("error" in result || "fieldErrors" in result) {
      return { error: "error" in result ? (result.error ?? "Failed to save draft.") : "Failed to save draft." };
    }
    invalidateEventFields(id, result.oldChurchId, result.affectedSeriesIds[0] ?? null);
    return { eventId: id };
  }
}

export async function saveEventAction(
  id: string,
  data: CreateEventInput
): Promise<{ success: true } | ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateEvent(id, parsed.data, session.user.id, session.user.role);
  if ("error" in result || "fieldErrors" in result) return result;

  invalidateEventFields(id, result.oldChurchId);
  if (result.newChurchId !== result.oldChurchId) updateTag(`church-${result.newChurchId}`);
  if (result.affectedSeriesIds.length > 0) {
    updateTag("series");
    result.affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }

  return { success: true };
}

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const result = await deleteEvent(id, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");

  broadcastEventChange(id, result.churchId, result.seriesId);
  redirect("/organiser");
}
