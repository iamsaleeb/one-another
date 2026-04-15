"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, registerEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { parseEventMetadata } from "@/lib/types/event-metadata";
import { canManageChurch } from "@/lib/permissions";
import type { ActionResult } from "@/lib/actions/auth";
import {
  scheduleEventReminder,
  cancelEventReminder,
  cancelAllRemindersForEvent,
  rescheduleEventReminders,
} from "@/lib/schedule-notification";
import { sendPushToUsers } from "@/lib/notifications";

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
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, date, time, datetimeISO, location, host, tag, description, seriesId, requiresRegistration, capacity, collectPhone, collectNotes, price, isDraft, photoUrl, campEndDate, campAllowPartialRegistration, campAgenda } = parsed.data;
  let { churchId } = parsed.data;

  const datetime = datetimeISO ? new Date(datetimeISO) : new Date(`${date}T${time}`);
  if (Number.isNaN(datetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  const allowed = await canManageChurch(session.user.id, session.user.role, churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate) {
    return { fieldErrors: { campEndDate: ["End date is required for camp events"] } };
  }

  const created = await prisma.event.create({
    data: {
      title,
      datetime,
      location,
      host,
      tag,
      description,
      isPast: false,
      isDraft: isDraft ?? false,
      requiresRegistration: requiresRegistration ?? false,
      metadata: {
        registration: {
          capacity: requiresRegistration ? (capacity ?? null) : null,
          collectPhone: requiresRegistration ? (collectPhone ?? false) : false,
          collectNotes: requiresRegistration ? (collectNotes ?? false) : false,
        },
        ...(isCamp && campEndDate
          ? {
              camp: {
                endDate: campEndDate,
                allowPartialRegistration: campAllowPartialRegistration ?? false,
                agenda: campAgenda ?? [],
              },
            }
          : {}),
      },
      price: price ?? null,
      photoUrl: photoUrl ?? null,
      churchId,
      ...(seriesId ? { seriesId } : {}),
      ...(session?.user?.id ? { createdById: session.user.id } : {}),
    },
    select: { id: true },
  });

  if (!isDraft && seriesId) {
    try {
      const followers = await prisma.seriesFollower.findMany({
        where: { seriesId },
        select: { userId: true },
      });
      const followerIds = followers.map((f) => f.userId);
      if (followerIds.length > 0) {
        await sendPushToUsers(
          followerIds,
          "NEW_SERIES_SESSION",
          "New Session Added",
          `A new session has been added: ${title}`,
          { type: "new_session", seriesId, eventId: created.id }
        );
      }
    } catch (err) {
      console.error("NEW_SERIES_SESSION push failed:", err);
    }
  }

  invalidateEventCaches(created.id, churchId, seriesId);
  redirect(isDraft ? "/organiser" : seriesId ? `/series/${seriesId}` : "/my-events");
}

export async function updateEventAction(id: string, data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, date, time, datetimeISO, location, host, tag, description, seriesId, requiresRegistration, capacity, collectPhone, collectNotes, price, photoUrl, campEndDate, campAllowPartialRegistration, campAgenda } = parsed.data;
  let { churchId } = parsed.data;
  const newDatetime = datetimeISO ? new Date(datetimeISO) : new Date(`${date}T${time}`);
  if (Number.isNaN(newDatetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  // Fetch existing event to verify permission on the original church and detect reschedule
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, datetime: true, title: true, isDraft: true, seriesId: true },
  });
  if (!existing) redirect("/organiser");

  const allowedOriginal = await canManageChurch(session.user.id, session.user.role, existing.churchId);
  if (!allowedOriginal) redirect("/");

  if (churchId !== existing.churchId) {
    const allowedNew = await canManageChurch(session.user.id, session.user.role, churchId);
    if (!allowedNew) redirect("/");
  }

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate) {
    return { fieldErrors: { campEndDate: ["End date is required for camp events"] } };
  }

  await prisma.event.update({
    where: { id },
    data: {
      title,
      datetime: newDatetime,
      location,
      host,
      tag,
      description,
      requiresRegistration: requiresRegistration ?? false,
      metadata: {
        registration: {
          capacity: requiresRegistration ? (capacity ?? null) : null,
          collectPhone: requiresRegistration ? (collectPhone ?? false) : false,
          collectNotes: requiresRegistration ? (collectNotes ?? false) : false,
        },
        ...(isCamp && campEndDate
          ? {
              camp: {
                endDate: campEndDate,
                allowPartialRegistration: campAllowPartialRegistration ?? false,
                agenda: campAgenda ?? [],
              },
            }
          : {}),
      },
      price: price ?? null,
      photoUrl: photoUrl ?? null,
      churchId,
      seriesId: seriesId ?? null,
    },
  });

  if (existing && !existing.isDraft && newDatetime.getTime() !== existing.datetime.getTime()) {
    try {
      await rescheduleEventReminders(id, newDatetime);
    } catch (err) {
      console.error("Failed to reschedule event reminders:", err);
    }
  }

  invalidateEventCaches(id, existing.churchId);
  if (churchId !== existing.churchId) updateTag(`church-${churchId}`);
  const affectedSeriesIds = [...new Set([existing.seriesId, seriesId ?? null].filter(Boolean) as string[])];
  if (affectedSeriesIds.length > 0) {
    updateTag("series");
    affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
  redirect(`/events/${id}`);
}

export async function cancelEventAction(id: string, reason: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, title: true, seriesId: true },
  });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: new Date(), cancellationReason: reason },
  });

  try {
    await cancelAllRemindersForEvent(id);

    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    const userIds = attendees.map((a) => a.userId);
    if (userIds.length > 0) {
      await sendPushToUsers(
        userIds,
        "EVENT_CANCELLED",
        "Event Cancelled",
        `${event.title} has been cancelled`,
        { type: "event_cancelled", eventId: id }
      );
    }
  } catch (err) {
    console.error("EVENT_CANCELLED push failed:", err);
  }

  invalidateEventCaches(id, event.churchId, event.seriesId);
  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true, seriesId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: null, cancellationReason: null },
  });

  invalidateEventCaches(id, event.churchId, event.seriesId);
  redirect(`/events/${id}`);
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true, title: true, isDraft: true, datetime: true },
  });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  if (!event.isDraft) {
    redirect(`/events/${id}`);
  }

  await prisma.event.update({ where: { id }, data: { isDraft: false } });

  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    await Promise.all(
      attendees.map((a) =>
        scheduleEventReminder(a.userId, { id, title: event.title, datetime: event.datetime })
      )
    );
  } catch (err) {
    console.error("Failed to schedule reminders on publish:", err);
  }

  if (event.seriesId) {
    try {
      const followers = await prisma.seriesFollower.findMany({
        where: { seriesId: event.seriesId },
        select: { userId: true },
      });
      const followerIds = followers.map((f) => f.userId);
      if (followerIds.length > 0) {
        await sendPushToUsers(
          followerIds,
          "NEW_SERIES_SESSION",
          "New Session Added",
          `A new session has been added: ${event.title}`,
          { type: "new_session", seriesId: event.seriesId, eventId: id }
        );
      }
    } catch (err) {
      console.error("NEW_SERIES_SESSION push failed:", err);
    }
  }

  invalidateEventCaches(id, event.churchId, event.seriesId);
  redirect(`/events/${id}`);
}

export async function unpublishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true, seriesId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  await prisma.event.update({ where: { id }, data: { isDraft: true } });

  try {
    await cancelAllRemindersForEvent(id);
  } catch (err) {
    console.error("Failed to cancel reminders on unpublish:", err);
  }

  invalidateEventCaches(id, event.churchId, event.seriesId);
  redirect(`/events/${id}`);
}

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true, seriesId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  try {
    await cancelAllRemindersForEvent(id);
  } catch (err) {
    console.error("Failed to cancel reminders before delete:", err);
  }

  await prisma.event.delete({ where: { id } });
  invalidateEventCaches(id, event.churchId, event.seriesId);
  redirect("/organiser");
}

export interface AttendEventState {
  error?: string;
}

export async function attendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, datetime: true, isDraft: true },
  });
  if (!event || event.isDraft) return { error: "Event not found." };

  await prisma.eventAttendee.create({
    data: { eventId, userId: session.user.id },
  });

  try {
    await scheduleEventReminder(session.user.id, event);
  } catch (err) {
    console.error("Failed to schedule event reminder:", err);
  }

  invalidateEventCaches(eventId);
  return {};
}

export async function unattendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await prisma.eventAttendee.delete({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  });

  try {
    await cancelEventReminder(session.user.id, eventId);
  } catch (err) {
    console.error("Failed to cancel event reminder:", err);
  }

  invalidateEventCaches(eventId);
  return {};
}

export interface RegisterEventState {
  success?: boolean;
  error?: string;
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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, datetime: true, isDraft: true, metadata: true, _count: { select: { attendees: true } } },
  });

  if (!event || event.isDraft) return { error: "Event not found." };

  const eventMeta = parseEventMetadata(event.metadata);
  const { capacity } = eventMeta.registration;
  if (capacity != null && event._count.attendees >= capacity) {
    return { error: "Sorry, this event is fully booked." };
  }

  // Validate selectedDays only when the event is a camp with partial registration enabled
  let validatedSelectedDays: string[] | undefined;
  if (eventMeta.camp?.allowPartialRegistration && eventMeta.camp.endDate) {
    const startDate = event.datetime.toISOString().slice(0, 10);
    const endDate = eventMeta.camp.endDate;
    const inRange = (d: string) => d >= startDate && d <= endDate;

    const days = parsed.data.selectedDays ?? [];
    const filtered = days.filter(inRange);
    if (filtered.length === 0) {
      return { error: "Please select at least one valid day to attend." };
    }
    validatedSelectedDays = filtered;
  }

  await prisma.eventAttendee.create({
    data: {
      eventId,
      userId: session.user.id,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
      ...(validatedSelectedDays ? { metadata: { selectedDays: validatedSelectedDays } } : {}),
    },
  });

  try {
    await scheduleEventReminder(session.user.id, {
      id: event.id,
      title: event.title,
      datetime: event.datetime,
    });
  } catch (err) {
    console.error("Failed to schedule event reminder after registration:", err);
  }

  invalidateEventCaches(eventId);
  return { success: true };
}
