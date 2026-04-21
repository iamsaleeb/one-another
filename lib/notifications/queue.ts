import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { subHours } from 'date-fns';

const DEFAULT_HOURS_BEFORE_EVENT = 2;

interface QueueInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduledFor?: Date;
  dedupeKey?: string;
}

export async function queueNotification(input: QueueInput): Promise<void> {
  const {
    userId, type, title, body,
    data,
    scheduledFor = new Date(),
    dedupeKey = undefined,
  } = input;

  const jsonData = (data !== undefined ? data : Prisma.DbNull) as Prisma.InputJsonValue;
  const basePayload = { userId, type, title, body, data: jsonData, scheduledFor };

  if (dedupeKey != null) {
    await prisma.notification.upsert({
      where: { userId_type_dedupeKey: { userId, type, dedupeKey } },
      create: { ...basePayload, dedupeKey },
      update: { scheduledFor, cancelledAt: null, title, body, data: jsonData },
    });
  } else {
    await prisma.notification.create({ data: { ...basePayload, dedupeKey: undefined } });
  }
}

interface CancelInput {
  userId: string;
  type: string;
  dedupeKey: string;
}

export async function cancelNotification(input: CancelInput): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: input.userId, type: input.type, dedupeKey: input.dedupeKey, sentAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}

interface CancelManyInput {
  type: string;
  dedupeKey: string;
}

export async function cancelManyNotifications(input: CancelManyInput): Promise<void> {
  await prisma.notification.updateMany({
    where: { type: input.type, dedupeKey: input.dedupeKey, sentAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}

interface RescheduleInput {
  userId?: string;
  type: string;
  dedupeKey: string;
  scheduledFor: Date;
}

export async function rescheduleNotification(input: RescheduleInput): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      ...(input.userId ? { userId: input.userId } : {}),
      type: input.type,
      dedupeKey: input.dedupeKey,
      sentAt: null,
    },
    data: { scheduledFor: input.scheduledFor, cancelledAt: null },
  });
}

interface EventRef {
  id: string;
  title: string;
  datetime: Date;
}

/**
 * Schedule an EVENT_REMINDER for a user attending an event.
 * Reads the user's hoursBeforeEvent preference. Skips if the reminder window has passed.
 * Upserts via dedupeKey=eventId so attending twice is safe.
 */
export async function scheduleEventReminderNotification(userId: string, event: EventRef): Promise<void> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type: 'EVENT_REMINDER' } },
    select: { config: true },
  });

  let hours = DEFAULT_HOURS_BEFORE_EVENT;
  if (pref?.config && typeof pref.config === 'object' && !Array.isArray(pref.config)) {
    const h = (pref.config as Record<string, unknown>).hoursBeforeEvent;
    if (typeof h === 'number') hours = h;
  }

  const scheduledFor = subHours(event.datetime, hours);
  if (scheduledFor <= new Date()) return;

  await queueNotification({
    userId,
    type: 'EVENT_REMINDER',
    title: 'Event Reminder',
    body: `${event.title} starts in ${hours === 1 ? '1 hour' : `${hours} hours`}`,
    data: {
      type: 'event_reminder',
      eventId: event.id,
      eventTitle: event.title,
      eventDatetime: event.datetime.toISOString(),
    },
    scheduledFor,
    dedupeKey: event.id,
  });
}

/**
 * Reschedule all pending EVENT_REMINDER notifications for an event when its datetime changes.
 * Preserves each attendee's hoursBeforeEvent preference and updates body + data.eventDatetime.
 */
export async function rescheduleEventReminderNotifications(eventId: string, newDatetime: Date): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: { type: 'EVENT_REMINDER', dedupeKey: eventId, sentAt: null, cancelledAt: null },
    select: { id: true, userId: true, data: true },
  });

  if (pending.length === 0) return;

  const userIds = [...new Set(pending.map((n) => n.userId))];
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, type: 'EVENT_REMINDER' },
    select: { userId: true, config: true },
  });
  const hoursMap = new Map<string, number>();
  for (const pref of prefs) {
    if (pref.config && typeof pref.config === 'object' && !Array.isArray(pref.config)) {
      const hours = (pref.config as Record<string, unknown>).hoursBeforeEvent;
      if (typeof hours === 'number') hoursMap.set(pref.userId, hours);
    }
  }

  await prisma.$transaction(
    pending.map((notif) => {
      const hours = hoursMap.get(notif.userId) ?? DEFAULT_HOURS_BEFORE_EVENT;
      const newScheduledFor = subHours(newDatetime, hours);
      const existingData = (notif.data ?? {}) as Record<string, string>;
      return prisma.notification.update({
        where: { id: notif.id },
        data: {
          scheduledFor: newScheduledFor,
          body: `${existingData.eventTitle} starts in ${hours === 1 ? '1 hour' : `${hours} hours`}`,
          data: { ...existingData, eventDatetime: newDatetime.toISOString() },
        },
      });
    })
  );
}

/**
 * Update scheduledFor + body on all a user's pending EVENT_REMINDER notifications
 * when they change their hoursBeforeEvent preference.
 */
export async function updateUserReminderSchedule(userId: string, newHoursBeforeEvent: number): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: { userId, type: 'EVENT_REMINDER', sentAt: null, cancelledAt: null, scheduledFor: { gt: new Date() } },
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
          body: `${data.eventTitle} starts in ${newHoursBeforeEvent === 1 ? '1 hour' : `${newHoursBeforeEvent} hours`}`,
        },
      }),
    ];
  });

  if (updates.length > 0) await prisma.$transaction(updates);
}
