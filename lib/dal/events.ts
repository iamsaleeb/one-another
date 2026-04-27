import "server-only";

import { prisma } from "@/lib/db";
import { canManageChurch } from "@/lib/permissions";
import {
  queueNotification,
  cancelManyNotifications,
  rescheduleEventReminderNotifications,
  scheduleEventReminderNotification,
} from "@/lib/notifications/queue";
import type { CreateEventInput } from "@/lib/validations/event";

async function notifySeriesFollowers(seriesId: string, title: string, eventId: string) {
  const followers = await prisma.seriesFollower.findMany({
    where: { seriesId },
    select: { userId: true },
  });
  if (followers.length === 0) return;
  await Promise.all(
    followers.map((f) =>
      queueNotification({
        userId: f.userId,
        type: "NEW_SERIES_SESSION",
        title: "New Session Added",
        body: `A new session has been added: ${title}`,
        data: { type: "new_session", seriesId, eventId },
      })
    )
  );
}

async function notifyEventAttendees(eventId: string, title: string) {
  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId },
    select: { userId: true },
  });
  if (attendees.length === 0) return;
  await Promise.all(
    attendees.map((a) =>
      queueNotification({
        userId: a.userId,
        type: "EVENT_CANCELLED",
        title: "Event Cancelled",
        body: `${title} has been cancelled`,
        data: { type: "event_cancelled", eventId },
      })
    )
  );
}

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

export async function createEvent(
  data: CreateEventInput,
  userId: string,
  userRole: string
): Promise<DalError | { id: string; churchId: string | null; seriesId: string | null; isDraft: boolean }> {
  const {
    title,
    date,
    time,
    datetimeISO,
    location,
    host,
    tag,
    description,
    seriesId,
    requiresRegistration,
    capacity,
    collectPhone,
    collectNotes,
    price,
    isDraft,
    photoUrl,
    campEndDate,
    campAllowPartialRegistration,
    campAgenda,
  } = data;
  let { churchId } = data;

  let datetime: Date | null = null;
  if (datetimeISO) {
    datetime = new Date(datetimeISO);
    if (Number.isNaN(datetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };
  } else if (date && time) {
    datetime = new Date(`${date}T${time}`);
    if (Number.isNaN(datetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };
  }

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) return { fieldErrors: { churchId: ["Church is required"] } };

  const allowed = await canManageChurch(userId, userRole, churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate && !isDraft) return { fieldErrors: { campEndDate: ["End date is required for camp events"] } };

  const created = await prisma.event.create({
    data: {
      title: title || "",
      datetime: datetime ?? null,
      location: location || null,
      host: host || null,
      tag: tag || "",
      description: description || "",
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
      createdById: userId,
    },
    select: { id: true },
  });

  if (!isDraft && seriesId) {
    try {
      await notifySeriesFollowers(seriesId, title, created.id);
    } catch (err) {
      console.error("NEW_SERIES_SESSION push failed:", err);
    }
  }

  return { id: created.id, churchId, seriesId: seriesId ?? null, isDraft: isDraft ?? false };
}

export async function updateEvent(
  id: string,
  data: CreateEventInput,
  userId: string,
  userRole: string
): Promise<
  | DalError
  | { oldChurchId: string | null; newChurchId: string | null; affectedSeriesIds: string[] }
> {
  const {
    title,
    date,
    time,
    datetimeISO,
    location,
    host,
    tag,
    description,
    seriesId,
    requiresRegistration,
    capacity,
    collectPhone,
    collectNotes,
    price,
    isDraft,
    photoUrl,
    campEndDate,
    campAllowPartialRegistration,
    campAgenda,
  } = data;
  let { churchId } = data;

  let newDatetime: Date | null = null;
  if (datetimeISO) {
    newDatetime = new Date(datetimeISO);
    if (Number.isNaN(newDatetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };
  } else if (date && time) {
    newDatetime = new Date(`${date}T${time}`);
    if (Number.isNaN(newDatetime.getTime())) return { fieldErrors: { date: ["Invalid date or time"] } };
  }

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) return { fieldErrors: { churchId: ["Church is required"] } };

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, datetime: true, isDraft: true, seriesId: true },
  });
  if (!existing) return { error: "Event not found." };

  const allowedOriginal = await canManageChurch(userId, userRole, existing.churchId);
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await canManageChurch(userId, userRole, churchId);
    if (!allowedNew) return { error: "Unauthorised." };
  }

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate && !isDraft) return { fieldErrors: { campEndDate: ["End date is required for camp events"] } };

  await prisma.event.update({
    where: { id },
    data: {
      title: title || "",
      datetime: newDatetime ?? null,
      location: location || null,
      host: host || null,
      tag: tag || "",
      description: description || "",
      requiresRegistration: requiresRegistration ?? false,
      ...(isDraft !== undefined ? { isDraft } : {}),
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

  if (!existing.isDraft && newDatetime && existing.datetime && newDatetime.getTime() !== existing.datetime.getTime()) {
    try {
      await rescheduleEventReminderNotifications(id, newDatetime);
    } catch (err) {
      console.error("Failed to reschedule event reminders:", err);
    }
  }

  const affectedSeriesIds = [
    ...new Set([existing.seriesId, seriesId ?? null].filter(Boolean) as string[]),
  ];

  return { oldChurchId: existing.churchId, newChurchId: churchId, affectedSeriesIds };
}

export async function cancelEvent(
  id: string,
  reason: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string | null; seriesId: string | null }> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, title: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await canManageChurch(userId, userRole, event.churchId);
  if (!allowed) return { error: "Unauthorised." };

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: new Date(), cancellationReason: reason },
  });

  try {
    await cancelManyNotifications({ type: "EVENT_REMINDER", dedupeKey: id });
    await notifyEventAttendees(id, event.title);
  } catch (err) {
    console.error("EVENT_CANCELLED push failed:", err);
  }

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function uncancelEvent(
  id: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string | null; seriesId: string | null }> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await canManageChurch(userId, userRole, event.churchId);
  if (!allowed) return { error: "Unauthorised." };

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: null, cancellationReason: null },
  });

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function publishEvent(
  id: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string | null; seriesId: string | null; alreadyPublished: boolean }> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true, title: true, isDraft: true, datetime: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await canManageChurch(userId, userRole, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  if (!event.isDraft) {
    return { churchId: event.churchId, seriesId: event.seriesId, alreadyPublished: true };
  }

  await prisma.event.update({ where: { id }, data: { isDraft: false } });

  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    await Promise.all(
      attendees.map((a) =>
        scheduleEventReminderNotification(a.userId, { id, title: event.title, datetime: event.datetime })
      )
    );
  } catch (err) {
    console.error("Failed to schedule reminders on publish:", err);
  }

  if (event.seriesId) {
    try {
      await notifySeriesFollowers(event.seriesId, event.title, id);
    } catch (err) {
      console.error("NEW_SERIES_SESSION push failed:", err);
    }
  }

  return { churchId: event.churchId, seriesId: event.seriesId, alreadyPublished: false };
}

export async function unpublishEvent(
  id: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string | null; seriesId: string | null }> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await canManageChurch(userId, userRole, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  await prisma.event.update({ where: { id }, data: { isDraft: true } });

  try {
    await cancelManyNotifications({ type: "EVENT_REMINDER", dedupeKey: id });
  } catch (err) {
    console.error("Failed to cancel reminders on unpublish:", err);
  }

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function deleteEvent(
  id: string,
  userId: string,
  userRole: string
): Promise<{ error: string } | { churchId: string | null; seriesId: string | null }> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await canManageChurch(userId, userRole, event.churchId);
  if (!allowed) return { error: "Unauthorised." };

  try {
    await cancelManyNotifications({ type: "EVENT_REMINDER", dedupeKey: id });
  } catch (err) {
    console.error("Failed to cancel reminders before delete:", err);
  }

  await prisma.event.delete({ where: { id } });

  return { churchId: event.churchId, seriesId: event.seriesId };
}
