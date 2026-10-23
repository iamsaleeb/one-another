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
      update: {
        scheduledFor,
        cancelledAt: null,
        // A fresh row: any run holding the old one no longer owns it.
        claimedUntil: null,
        attempts: 0,
        title,
        body,
        data: jsonData,
      },
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
    data: {
      scheduledFor,
      cancelledAt: null,
      // A fresh row: any run holding the old one no longer owns it.
      claimedUntil: null,
      attempts: 0,
      title,
      body,
      data: jsonData,
    },
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

interface CancelManyInput {
  type: NotificationType;
  // One key, or several to cancel in a single statement.
  dedupeKey: string | string[];
  // Only this user's; everyone's when omitted.
  userId?: string;
}

export async function cancelManyNotifications(
  input: CancelManyInput,
  db: Db = prisma
): Promise<void> {
  const { dedupeKey, userId } = input;
  await db.notification.updateMany({
    where: {
      type: input.type,
      dedupeKey: Array.isArray(dedupeKey) ? { in: dedupeKey } : dedupeKey,
      ...(userId ? { userId } : {}),
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
 *
 * With `only`, just that user's reminder is synced, so one attendee joining
 * or leaving touches one row: pass `attendeeIds` as `[userId]` while they
 * attend, `[]` once they have left.
 */
export async function syncEventReminders(
  event: LiveEventRef,
  attendeeIds: string[],
  db: Db = prisma,
  only?: { userId: string }
): Promise<void> {
  if (only && attendeeIds.some((id) => id !== only.userId)) {
    throw new Error("syncEventReminders: attendeeIds outside `only`");
  }
  // Withdraw everything pending, then queue what should be: queueNotification
  // revives a withdrawn row, so an unchanged reminder ends up as it was.
  await cancelManyNotifications(
    {
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: event.id,
      userId: only?.userId,
    },
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
