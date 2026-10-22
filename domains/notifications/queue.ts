import "server-only";
import { prisma, type Db } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";
import { subHours } from "date-fns";

const DEFAULT_HOURS_BEFORE_EVENT = 2;

// Every write below takes an optional `db`, so a caller can queue or cancel
// notifications inside its own transaction.

interface QueueInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduledFor?: Date;
  dedupeKey?: string;
}

export async function queueNotification(
  input: QueueInput,
  db: Db = prisma
): Promise<void> {
  const {
    userId,
    type,
    title,
    body,
    data,
    scheduledFor = new Date(),
    dedupeKey = undefined,
  } = input;

  const jsonData = (
    data !== undefined ? data : Prisma.DbNull
  ) as Prisma.InputJsonValue;
  const basePayload = {
    userId,
    type,
    title,
    body,
    data: jsonData,
    scheduledFor,
  };

  if (dedupeKey != null) {
    await db.notification.upsert({
      where: { userId_type_dedupeKey: { userId, type, dedupeKey } },
      create: { ...basePayload, dedupeKey },
      update: { scheduledFor, cancelledAt: null, title, body, data: jsonData },
    });
  } else {
    await db.notification.create({
      data: { ...basePayload, dedupeKey: undefined },
    });
  }
}

type FanOutInput = Omit<QueueInput, "userId" | "dedupeKey"> & {
  dedupeKey: string;
};

/**
 * Queues the same notification for many users in two statements, with the
 * same effect as queueNotification per user: an existing row for the key is
 * refreshed and un-cancelled, and a missing one is created.
 */
export async function queueNotificationForUsers(
  userIds: string[],
  input: FanOutInput,
  db: Db = prisma
): Promise<void> {
  if (userIds.length === 0) return;
  const { type, title, body, data, dedupeKey } = input;
  const scheduledFor = input.scheduledFor ?? new Date();
  const jsonData = (
    data !== undefined ? data : Prisma.DbNull
  ) as Prisma.InputJsonValue;

  await db.notification.updateMany({
    where: { userId: { in: userIds }, type, dedupeKey },
    data: { scheduledFor, cancelledAt: null, title, body, data: jsonData },
  });
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      data: jsonData,
      scheduledFor,
      dedupeKey,
    })),
    skipDuplicates: true,
  });
}

interface CancelInput {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
}

export async function cancelNotification(
  input: CancelInput,
  db: Db = prisma
): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId: input.userId,
      type: input.type,
      dedupeKey: input.dedupeKey,
      sentAt: null,
      cancelledAt: null,
    },
    data: { cancelledAt: new Date() },
  });
}

interface CancelManyInput {
  type: NotificationType;
  dedupeKey: string;
}

export async function cancelManyNotifications(
  input: CancelManyInput,
  db: Db = prisma
): Promise<void> {
  await db.notification.updateMany({
    where: {
      type: input.type,
      dedupeKey: input.dedupeKey,
      sentAt: null,
      cancelledAt: null,
    },
    data: { cancelledAt: new Date() },
  });
}

interface EventRef {
  id: string;
  title: string;
  datetime: Date | null;
}

/**
 * Schedule an EVENT_REMINDER for a user attending an event.
 * Reads the user's hoursBeforeEvent preference. Skips if the reminder window has passed.
 * Upserts via dedupeKey=eventId so attending twice is safe.
 */
export async function scheduleEventReminderNotification(
  userId: string,
  event: EventRef,
  db: Db = prisma
): Promise<void> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId_type: { userId, type: NotificationType.EVENT_REMINDER } },
    select: { config: true },
  });

  let hours = DEFAULT_HOURS_BEFORE_EVENT;
  if (
    pref?.config &&
    typeof pref.config === "object" &&
    !Array.isArray(pref.config)
  ) {
    const h = (pref.config as Record<string, unknown>).hoursBeforeEvent;
    if (typeof h === "number") hours = h;
  }

  if (!event.datetime) return;

  const scheduledFor = subHours(event.datetime, hours);
  if (scheduledFor <= new Date()) return;

  await queueNotification(
    {
      userId,
      type: NotificationType.EVENT_REMINDER,
      title: "Event Reminder",
      body: `${event.title} starts in ${hours === 1 ? "1 hour" : `${hours} hours`}`,
      data: {
        type: "event_reminder",
        eventId: event.id,
        eventTitle: event.title,
        eventDatetime: event.datetime.toISOString(),
      },
      scheduledFor,
      dedupeKey: event.id,
    },
    db
  );
}

/**
 * Schedule EVENT_REMINDER notifications for multiple attendees in a single batch.
 * Fetches all hoursBeforeEvent preferences in one findMany query instead of N findUniques.
 * Skips any user whose reminder window has already passed.
 */
export async function scheduleEventReminderNotifications(
  userIds: string[],
  event: EventRef,
  db: Db = prisma
): Promise<void> {
  if (userIds.length === 0 || !event.datetime) return;

  const datetime = event.datetime;

  const prefs = await db.notificationPreference.findMany({
    where: { userId: { in: userIds }, type: NotificationType.EVENT_REMINDER },
    select: { userId: true, config: true },
  });

  const hoursMap = new Map<string, number>();
  for (const pref of prefs) {
    if (
      pref.config &&
      typeof pref.config === "object" &&
      !Array.isArray(pref.config)
    ) {
      const h = (pref.config as Record<string, unknown>).hoursBeforeEvent;
      if (typeof h === "number") hoursMap.set(pref.userId, h);
    }
  }

  const now = new Date();
  const CONCURRENCY = 20;
  for (let i = 0; i < userIds.length; i += CONCURRENCY) {
    await Promise.all(
      userIds.slice(i, i + CONCURRENCY).map((userId) => {
        const hours = hoursMap.get(userId) ?? DEFAULT_HOURS_BEFORE_EVENT;
        const scheduledFor = subHours(datetime, hours);
        if (scheduledFor <= now) return Promise.resolve();
        return queueNotification(
          {
            userId,
            type: NotificationType.EVENT_REMINDER,
            title: "Event Reminder",
            body: `${event.title} starts in ${hours === 1 ? "1 hour" : `${hours} hours`}`,
            data: {
              type: "event_reminder",
              eventId: event.id,
              eventTitle: event.title,
              eventDatetime: datetime.toISOString(),
            },
            scheduledFor,
            dedupeKey: event.id,
          },
          db
        );
      })
    );
  }
}

/**
 * Reschedule all pending EVENT_REMINDER notifications for an event when its datetime changes.
 * Preserves each attendee's hoursBeforeEvent preference and updates body + data.eventDatetime.
 */
export async function rescheduleEventReminderNotifications(
  eventId: string,
  newDatetime: Date,
  db: Db = prisma
): Promise<void> {
  const pending = await db.notification.findMany({
    where: {
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: eventId,
      sentAt: null,
      cancelledAt: null,
    },
    select: { id: true, userId: true, data: true },
  });

  if (pending.length === 0) return;

  const userIds = [...new Set(pending.map((n) => n.userId))];
  const prefs = await db.notificationPreference.findMany({
    where: { userId: { in: userIds }, type: NotificationType.EVENT_REMINDER },
    select: { userId: true, config: true },
  });
  const hoursMap = new Map<string, number>();
  for (const pref of prefs) {
    if (
      pref.config &&
      typeof pref.config === "object" &&
      !Array.isArray(pref.config)
    ) {
      const hours = (pref.config as Record<string, unknown>).hoursBeforeEvent;
      if (typeof hours === "number") hoursMap.set(pref.userId, hours);
    }
  }

  for (const notif of pending) {
    const hours = hoursMap.get(notif.userId) ?? DEFAULT_HOURS_BEFORE_EVENT;
    const newScheduledFor = subHours(newDatetime, hours);
    const existingData = (notif.data ?? {}) as Record<string, string>;
    await db.notification.update({
      where: { id: notif.id },
      data: {
        scheduledFor: newScheduledFor,
        body: `${existingData.eventTitle} starts in ${hours === 1 ? "1 hour" : `${hours} hours`}`,
        data: { ...existingData, eventDatetime: newDatetime.toISOString() },
      },
    });
  }
}

/**
 * Update scheduledFor + body on all a user's pending EVENT_REMINDER notifications
 * when they change their hoursBeforeEvent preference.
 */
export async function updateUserReminderSchedule(
  userId: string,
  newHoursBeforeEvent: number
): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: {
      userId,
      type: NotificationType.EVENT_REMINDER,
      sentAt: null,
      cancelledAt: null,
      scheduledFor: { gt: new Date() },
    },
    select: { id: true, data: true },
  });

  const updates = pending.flatMap((notif) => {
    const data = (notif.data ?? {}) as Record<string, string>;
    const eventDatetime = new Date(data.eventDatetime);
    const newScheduledFor = subHours(eventDatetime, newHoursBeforeEvent);
    if (newScheduledFor <= new Date()) return [];
    return [
      prisma.notification.update({
        where: { id: notif.id },
        data: {
          scheduledFor: newScheduledFor,
          body: `${data.eventTitle} starts in ${newHoursBeforeEvent === 1 ? "1 hour" : `${newHoursBeforeEvent} hours`}`,
        },
      }),
    ];
  });

  if (updates.length > 0) await prisma.$transaction(updates);
}
