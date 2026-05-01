"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, saveDraftSchema, type CreateEventInput, type SaveDraftInput } from "@/lib/validations/event";
import { createEvent, updateEvent, cancelEvent, uncancelEvent, publishEvent, unpublishEvent, deleteEvent } from "@/lib/dal/events";
import type { ActionResult } from "@/lib/actions/auth";
import { broadcastEventChange, invalidateEventFields, invalidateEventUpdate } from "@/lib/actions/_cache";

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

  invalidateEventUpdate(id, result);
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
): Promise<{ eventId: string } | ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = saveDraftSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (!id) {
    const result = await createEvent({ ...parsed.data, isDraft: true }, session.user.id, session.user.role);
    if ("error" in result || "fieldErrors" in result) return result;
    invalidateEventFields(result.id, result.churchId, result.seriesId ?? null);
    return { eventId: result.id };
  } else {
    const result = await updateEvent(id, { ...parsed.data, isDraft: parsed.data.isDraft ?? true }, session.user.id, session.user.role);
    if ("error" in result || "fieldErrors" in result) return result;
    invalidateEventUpdate(id, result);
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

  invalidateEventUpdate(id, result);

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
