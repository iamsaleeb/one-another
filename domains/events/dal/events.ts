import "server-only";

import { accessibleBy } from "@casl/prisma";
import { prisma } from "@/lib/db";
import { NotificationType, type Prisma } from "@prisma/client";
import {
  eventSubject,
  type Action,
  type AppAbility,
} from "@/domains/roles/lib/ability";
import { getAbility, getSessionUserId } from "@/domains/roles/lib/get-ability";
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

// Trusted callers with no session (cron, workers) pass `systemAbility()`.
export interface WriteOptions {
  ability?: AppAbility;
}

// Scopes a query to the Events this Ability may act on. Put first in `AND` so
// the CASL extension can short-circuit an empty condition.
function scopedTo(ability: AppAbility, action: Action, id: string) {
  return { id, AND: [accessibleBy(ability, action).ofType("Event")] };
}

// Loads an Event the Ability may act on, telling "missing" apart from
// "forbidden" only after the scoped read has failed.
async function findForAction<S extends Prisma.EventSelect>(
  ability: AppAbility,
  action: Action,
  id: string,
  select: S
): Promise<Prisma.EventGetPayload<{ select: S }> | { error: string }> {
  const event = await prisma.event.findFirst({
    where: scopedTo(ability, action, id),
    select,
  });
  if (event) return event as Prisma.EventGetPayload<{ select: S }>;
  const exists = await prisma.event.count({ where: { id } });
  return { error: exists ? "Unauthorised." : "Event not found." };
}

export async function createEvent(
  data: CreateEventInput,
  opts?: WriteOptions
): Promise<
  | DalError
  | {
      id: string;
      churchId: string | null;
      seriesId: string | null;
      isDraft: boolean;
    }
> {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Unauthorised." };
  const ability = opts?.ability ?? (await getAbility());

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

  if (
    !ability.can(
      "create",
      eventSubject({ churchId, seriesId: seriesId ?? null })
    )
  )
    return { error: "Unauthorised." };

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

  // Creator Grant: if no Church or Series Grant already lets the creator edit
  // the new Event (e.g. Church EVENT_CREATOR, SERIES_SESSION_CREATOR), give
  // them EVENT_EDITOR on it so they can manage what they made.
  const canEditCreated = ability.can(
    "update",
    eventSubject({ id: created.id, churchId, seriesId: seriesId ?? null })
  );
  if (!canEditCreated) {
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
  opts?: WriteOptions
): Promise<
  | DalError
  | {
      oldChurchId: string | null;
      newChurchId: string | null;
      affectedSeriesIds: string[];
    }
> {
  const ability = opts?.ability ?? (await getAbility());
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

  const existing = await findForAction(ability, "update", id, {
    churchId: true,
    datetime: true,
    isDraft: true,
    seriesId: true,
  });
  if ("error" in existing) return existing;

  // Moving an Event to another Church or Series needs authority over the
  // destination too: the user must be able to place an Event there.
  const newSeriesId = seriesId ?? null;
  const moved =
    churchId !== existing.churchId || newSeriesId !== existing.seriesId;
  if (
    moved &&
    !ability.can("create", eventSubject({ churchId, seriesId: newSeriesId }))
  )
    return { error: "Unauthorised." };

  const isCamp = tag === "Camp";
  if (isCamp && !campEndDate && !isDraft)
    return {
      fieldErrors: { campEndDate: ["End date is required for camp events"] },
    };

  await prisma.event.update({
    where: scopedTo(ability, "update", id),
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
      seriesId: newSeriesId,
    },
  });

  if (questions !== undefined) {
    const userId = await getSessionUserId();
    await syncEventQuestions(id, questions, userId ?? "");
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

  // An Event leaving a Series must not leave behind a pending "new session"
  // notification for that Series' followers.
  if (existing.seriesId && existing.seriesId !== newSeriesId) {
    try {
      await cancelManyNotifications({
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: `${existing.seriesId}:${id}`,
      });
    } catch (err) {
      console.error("Failed to cancel old series notifications:", err);
    }
  }

  const affectedSeriesIds = [
    ...new Set([existing.seriesId, newSeriesId].filter(Boolean) as string[]),
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
  opts?: WriteOptions
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const ability = opts?.ability ?? (await getAbility());
  const event = await findForAction(ability, "update", id, {
    churchId: true,
    title: true,
    seriesId: true,
  });
  if ("error" in event) return event;

  await prisma.event.update({
    where: scopedTo(ability, "update", id),
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
  opts?: WriteOptions
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const ability = opts?.ability ?? (await getAbility());
  const event = await findForAction(ability, "update", id, {
    churchId: true,
    seriesId: true,
  });
  if ("error" in event) return event;

  await prisma.event.update({
    where: scopedTo(ability, "update", id),
    data: { cancelledAt: null, cancellationReason: null },
  });

  return { churchId: event.churchId, seriesId: event.seriesId };
}

export async function publishEvent(
  id: string,
  opts?: WriteOptions
): Promise<
  | { error: string }
  | {
      churchId: string | null;
      seriesId: string | null;
      alreadyPublished: boolean;
    }
> {
  const ability = opts?.ability ?? (await getAbility());
  const event = await findForAction(ability, "publish", id, {
    churchId: true,
    seriesId: true,
    title: true,
    isDraft: true,
    datetime: true,
  });
  if ("error" in event) return event;

  if (!event.isDraft) {
    return {
      churchId: event.churchId,
      seriesId: event.seriesId,
      alreadyPublished: true,
    };
  }

  await prisma.event.update({
    where: scopedTo(ability, "publish", id),
    data: { isDraft: false },
  });

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
  opts?: WriteOptions
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const ability = opts?.ability ?? (await getAbility());
  const event = await findForAction(ability, "publish", id, {
    churchId: true,
    seriesId: true,
  });
  if ("error" in event) return event;

  await prisma.event.update({
    where: scopedTo(ability, "publish", id),
    data: { isDraft: true },
  });

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
  opts?: WriteOptions
): Promise<
  { error: string } | { churchId: string | null; seriesId: string | null }
> {
  const ability = opts?.ability ?? (await getAbility());
  const event = await findForAction(ability, "delete", id, {
    churchId: true,
    seriesId: true,
  });
  if ("error" in event) return event;

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

  await prisma.event.delete({ where: scopedTo(ability, "delete", id) });

  return { churchId: event.churchId, seriesId: event.seriesId };
}
