"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { createEvent, updateEvent, cancelEvent, uncancelEvent, publishEvent, unpublishEvent, deleteEvent } from "@/lib/dal/events";
import type { ActionResult } from "@/lib/actions/auth";

function invalidateEventCaches(id: string, churchId?: string | null, seriesId?: string | null) {
  updateTag("events");
  updateTag(`event-${id}`);
  if (churchId) {
    updateTag("churches");
    updateTag(`church-${churchId}`);
  }
  if (seriesId) {
    updateTag("series");
    updateTag(`series-${seriesId}`);
  }
}

export async function createEventAction(data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createEvent(parsed.data, session.user.id, session.user.role);
  if ("error" in result || "fieldErrors" in result) return result;

  invalidateEventCaches(result.id, result.churchId, result.seriesId);
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

  invalidateEventCaches(id, result.oldChurchId);
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

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const result = await uncancelEvent(id, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const result = await publishEvent(id, session.user.id, session.user.role);
  if ("error" in result) return result;

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function unpublishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const result = await unpublishEvent(id, session.user.id, session.user.role);
  if ("error" in result) return result;

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect(`/events/${id}`);
}

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const result = await deleteEvent(id, session.user.id, session.user.role);
  if ("error" in result) redirect("/organiser");

  invalidateEventCaches(id, result.churchId, result.seriesId);
  redirect("/organiser");
}
