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

  await queueReminder(userId, event, hoursFrom(pref?.config), db);
}

function reminderBody(title: string, hours: number): string {
  return `${title} starts in ${hours === 1 ? "1 hour" : `${hours} hours`}`;
}

// Queues `userId`'s reminder `hours` before the Event, unless that time has
// already passed.
async function queueReminder(
  userId: string,
  event: EventRef,
  hours: number,
  db: Db,
  now = new Date()
): Promise<void> {
  if (!event.datetime) return;
  const scheduledFor = subHours(event.datetime, hours);
  if (scheduledFor <= now) return;

  await queueNotification(
    {
      userId,
      type: NotificationType.EVENT_REMINDER,
      title: "Event Reminder",
      body: reminderBody(event.title, hours),
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

function hoursFrom(config: unknown): number {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const h = (config as Record<string, unknown>).hoursBeforeEvent;
    if (typeof h === "number") return h;
  }
  return DEFAULT_HOURS_BEFORE_EVENT;
}

interface LiveEventRef extends EventRef {
  // Published and not cancelled: an Event its attendees should hear about.
  live: boolean;
}

/**
 * Makes an Event's EVENT_REMINDERs match it. While the Event is live, each
 * attendee has one pending reminder at their preferred time before it, with
 * its current title; otherwise none is pending. A reminder that has already
 * gone out is left alone, and none is queued once its time has passed.
 */
export async function syncEventReminders(
  event: LiveEventRef,
  attendeeIds: string[],
  db: Db = prisma
): Promise<void> {
  // Withdraw everything pending, then queue what should be: queueNotification
  // revives a withdrawn row, so an unchanged reminder ends up as it was.
  await cancelManyNotifications(
    { type: NotificationType.EVENT_REMINDER, dedupeKey: event.id },
    db
  );
  if (!event.live || !event.datetime || attendeeIds.length === 0) return;

  const [sent, prefs] = await Promise.all([
    db.notification.findMany({
      where: {
        type: NotificationType.EVENT_REMINDER,
        dedupeKey: event.id,
        userId: { in: attendeeIds },
        sentAt: { not: null },
      },
      select: { userId: true },
    }),
    db.notificationPreference.findMany({
      where: {
        userId: { in: attendeeIds },
        type: NotificationType.EVENT_REMINDER,
      },
      select: { userId: true, config: true },
    }),
  ]);
  const sentTo = new Set(sent.map((n) => n.userId));
  const hoursFor = new Map(prefs.map((p) => [p.userId, hoursFrom(p.config)]));

  const now = new Date();
  for (const userId of attendeeIds) {
    if (sentTo.has(userId)) continue;
    const hours = hoursFor.get(userId) ?? DEFAULT_HOURS_BEFORE_EVENT;
    await queueReminder(userId, event, hours, db, now);
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
          body: reminderBody(data.eventTitle, newHoursBeforeEvent),
        },
      }),
    ];
  });

  if (updates.length > 0) await prisma.$transaction(updates);
}
