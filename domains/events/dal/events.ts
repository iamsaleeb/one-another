import "server-only";

import { prisma } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import type { Actor } from "@/domains/roles/lib/actor";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { syncEventQuestions } from "../questions/dal";
import {
  cancelManyNotifications,
  queueNotification,
  rescheduleEventReminderNotifications,
  scheduleEventReminderNotifications,
} from "@/domains/notifications/queue";
import type { CreateEventInput } from "../validations/event";

const NOTIFY_CONCURRENCY = 20;

async function notifySeriesFollowers(
  seriesId: string,
  title: string,
  eventId: string
) {
  const followers = await prisma.seriesFollower.findMany({
    where: { seriesId },
    select: { userId: true },
  });
  if (followers.length === 0) return;
  for (let i = 0; i < followers.length; i += NOTIFY_CONCURRENCY) {
    await Promise.all(
      followers.slice(i, i + NOTIFY_CONCURRENCY).map((f) =>
        queueNotification({
          userId: f.userId,
          type: NotificationType.NEW_SERIES_SESSION,
          title: "New Session Added",
          body: `A new session has been added: ${title}`,
          data: { type: "new_session", seriesId, eventId },
          scheduledFor: new Date(),
          dedupeKey: `${seriesId}:${eventId}`,
        })
      )
    );
  }
}

async function notifyEventAttendees(eventId: string, title: string) {
  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId },
    select: { userId: true },
  });
  if (attendees.length === 0) return;
  for (let i = 0; i < attendees.length; i += NOTIFY_CONCURRENCY) {
    await Promise.all(
      attendees.slice(i, i + NOTIFY_CONCURRENCY).map((a) =>
        queueNotification({
          userId: a.userId,
          type: NotificationType.EVENT_CANCELLED,
          title: "Event Cancelled",
          body: `${title} has been cancelled`,
          data: { type: "event_cancelled", eventId },
          scheduledFor: new Date(),
          dedupeKey: `cancelled:${eventId}`,
        })
      )
    );
  }
}

type DalError = { error: string } | { fieldErrors: Record<string, string[]> };

export async function createEvent(
  data: CreateEventInput,
  userId: string,
  actor: Actor
): Promise<
  | DalError
  | {
      id: string;
      churchId: string | null;
      seriesId: string | null;
      isDraft: boolean;
    }
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
    questions,
  } = data;
  let { churchId } = data;

  let datetime: Date | null = null;
  if (datetimeISO) {
    datetime = new Date(datetimeISO);
    if (Number.isNaN(datetime.getTime()))
      return { fieldErrors: { date: ["Invalid date or time"] } };
  } else if (date && time) {
    datetime = new Date(`${date}T${time}`);
    if (Number.isNaN(datetime.getTime()))
      return { fieldErrors: { date: ["Invalid date or time"] } };
  }

  if (seriesId) {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      select: { churchId: true },
    });
    churchId = series?.churchId;
  }

  if (!churchId) return { fieldErrors: { churchId: ["Church is required"] } };

  const allowed = await actor.can(Capabilities.EVENT_CREATE, {
    churchId,
    seriesId: seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate && !isDraft)
    return {
      fieldErrors: { campEndDate: ["End date is required for camp events"] },
    };

  const created = await prisma.event.create({
    data: {
      title: title || "",
      datetime: datetime ?? null,
      location: location || null,
      host: host || null,
      tag: tag || "",
      description: description || "",
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

  if (questions && questions.length > 0) {
    await syncEventQuestions(created.id, questions, userId);
  }

  // Auto-assign EVENT_EDITOR on the new event for any user who lacks
  // church-level event:update — covers EVENT_CREATOR church role and
  // series staff who created via their series assignment.
  const hasChurchUpdateAccess = await actor.can(Capabilities.EVENT_UPDATE, {
    churchId,
  });
  if (!hasChurchUpdateAccess) {
    await prisma.eventStaffAssignment.create({
      data: {
        userId,
        eventId: created.id,
        role: "EVENT_EDITOR",
        assignedBy: userId,
      },
    });
  }

  if (!isDraft && seriesId) {
    try {
      await notifySeriesFollowers(seriesId, title, created.id);
    } catch (err) {
      console.error("NEW_SERIES_SESSION push failed:", err);
    }
  }

  return {
    id: created.id,
    churchId,
    seriesId: seriesId ?? null,
    isDraft: isDraft ?? false,
  };
}

export async function updateEvent(
  id: string,
  data: CreateEventInput,
  userId: string,
  actor: Actor
): Promise<
  | DalError
  | {
      oldChurchId: string | null;
      newChurchId: string | null;
      affectedSeriesIds: string[];
    }
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
    questions,
  } = data;
  let { churchId } = data;

  let newDatetime: Date | null = null;
  if (datetimeISO) {
    newDatetime = new Date(datetimeISO);
    if (Number.isNaN(newDatetime.getTime()))
      return { fieldErrors: { date: ["Invalid date or time"] } };
  } else if (date && time) {
    newDatetime = new Date(`${date}T${time}`);
    if (Number.isNaN(newDatetime.getTime()))
      return { fieldErrors: { date: ["Invalid date or time"] } };
  }

  if (seriesId) {
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      select: { churchId: true },
    });
    churchId = series?.churchId;
  }

  if (!churchId) return { fieldErrors: { churchId: ["Church is required"] } };

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, datetime: true, isDraft: true, seriesId: true },
  });
  if (!existing) return { error: "Event not found." };

  const allowedOriginal = await actor.can(Capabilities.EVENT_UPDATE, {
    churchId: existing.churchId,
    eventId: id,
    seriesId: existing.seriesId ?? undefined,
  });
  if (!allowedOriginal) return { error: "Unauthorised." };

  if (churchId !== existing.churchId) {
    const allowedNew = await actor.can(Capabilities.EVENT_UPDATE, {
      churchId,
    });
    if (!allowedNew) return { error: "Unauthorised." };
  }

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate && !isDraft)
    return {
      fieldErrors: { campEndDate: ["End date is required for camp events"] },
    };

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

  if (questions !== undefined) {
    await syncEventQuestions(id, questions, userId);
  }

  if (
    !existing.isDraft &&
    newDatetime &&
    existing.datetime &&
    newDatetime.getTime() !== existing.datetime.getTime()
  ) {
    try {
      await rescheduleEventReminderNotifications(id, newDatetime);
    } catch (err) {
      console.error("Failed to reschedule event reminders:", err);
    }
  }

  const affectedSeriesIds = [
    ...new Set(
      [existing.seriesId, seriesId ?? null].filter(Boolean) as string[]
    ),
  ];

  return {
    oldChurchId: existing.churchId,
    newChurchId: churchId,
    affectedSeriesIds,
  };
}

export async function cancelEvent(
  id: string,
  reason: string,
  userId: string,
  actor: Actor
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, title: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await actor.can(Capabilities.EVENT_UPDATE, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: new Date(), cancellationReason: reason },
  });

  try {
    await cancelManyNotifications({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: id,
    });
    await notifyEventAttendees(id, event.title);
  } catch (err) {
    console.error("EVENT_CANCELLED push failed:", err);
  }

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function uncancelEvent(
  id: string,
  userId: string,
  actor: Actor
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await actor.can(Capabilities.EVENT_UPDATE, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
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
  actor: Actor
): Promise<
  | { error: string }
  | {
      churchId: string | null;
      seriesId: string | null;
      alreadyPublished: boolean;
    }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      churchId: true,
      seriesId: true,
      title: true,
      isDraft: true,
      datetime: true,
    },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await actor.can(Capabilities.EVENT_PUBLISH, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "You are not assigned to this church." };

  if (!event.isDraft) {
    return {
      churchId: event.churchId,
      seriesId: event.seriesId,
      alreadyPublished: true,
    };
  }

  await prisma.event.update({ where: { id }, data: { isDraft: false } });

  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    if (attendees.length > 0) {
      const userIds = attendees.map((a) => a.userId);
      await scheduleEventReminderNotifications(userIds, {
        id,
        title: event.title,
        datetime: event.datetime,
      });
    }
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

  return {
    churchId: event.churchId,
    seriesId: event.seriesId,
    alreadyPublished: false,
  };
}

export async function unpublishEvent(
  id: string,
  userId: string,
  actor: Actor
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await actor.can(Capabilities.EVENT_PUBLISH, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "You are not assigned to this church." };

  await prisma.event.update({ where: { id }, data: { isDraft: true } });

  try {
    await cancelManyNotifications({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: id,
    });
    if (event.seriesId) {
      await cancelManyNotifications({
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: `${event.seriesId}:${id}`,
      });
    }
  } catch (err) {
    console.error("Failed to cancel reminders on unpublish:", err);
  }

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function deleteEvent(
  id: string,
  userId: string,
  actor: Actor
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true },
  });
  if (!event) return { error: "Event not found." };

  const allowed = await actor.can(Capabilities.EVENT_DELETE, {
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });
  if (!allowed) return { error: "Unauthorised." };

  try {
    await cancelManyNotifications({
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: id,
    });
    if (event.seriesId) {
      await cancelManyNotifications({
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: `${event.seriesId}:${id}`,
      });
    }
  } catch (err) {
    console.error("Failed to cancel reminders before delete:", err);
  }

  await prisma.event.delete({ where: { id } });

  return { churchId: event.churchId, seriesId: event.seriesId };
}
