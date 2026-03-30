import { prisma } from "@/lib/db";

const DEFAULT_HOURS_BEFORE_EVENT = 2;

interface EventRef {
  id: string;
  title: string;
  datetime: Date;
}

/**
 * Get a user's hoursBeforeEvent preference, falling back to the default.
 */
async function getHoursBeforeEvent(userId: string): Promise<number> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_type: { userId, type: "EVENT_REMINDER" } },
    select: { config: true },
  });

  if (pref?.config && typeof pref.config === "object" && !Array.isArray(pref.config)) {
    const hours = (pref.config as Record<string, unknown>).hoursBeforeEvent;
    if (typeof hours === "number") return hours;
  }

  return DEFAULT_HOURS_BEFORE_EVENT;
}

/**
 * Schedule an EVENT_REMINDER for a user attending an event.
 * Upserts by (userId, eventId) so attending twice never creates duplicates.
 * Does nothing if the reminder time has already passed.
 */
export async function scheduleEventReminder(userId: string, event: EventRef): Promise<void> {
  const hoursBeforeEvent = await getHoursBeforeEvent(userId);
  const scheduledFor = new Date(event.datetime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);

  if (scheduledFor <= new Date()) {
    // The reminder window has already passed — nothing to schedule
    return;
  }

  // Upsert: find an existing pending reminder for this user+event and update it,
  // or create a new one. We identify the record via the eventId stored in payload.
  const existing = await prisma.scheduledNotification.findFirst({
    where: {
      userId,
      type: "EVENT_REMINDER",
      sentAt: null,
      cancelledAt: null,
      payload: { path: ["data", "eventId"], equals: event.id },
    },
    select: { id: true },
  });

  const payload = {
    title: "Event Reminder",
    body: `${event.title} starts in ${hoursBeforeEvent === 1 ? "1 hour" : `${hoursBeforeEvent} hours`}`,
    data: {
      type: "event_reminder",
      eventId: event.id,
      // Store the raw event datetime so preferences can recalculate scheduledFor later
      eventDatetime: event.datetime.toISOString(),
    },
  };

  if (existing) {
    await prisma.scheduledNotification.update({
      where: { id: existing.id },
      data: { scheduledFor, payload },
    });
  } else {
    await prisma.scheduledNotification.create({
      data: { userId, type: "EVENT_REMINDER", scheduledFor, payload },
    });
  }
}

/**
 * Cancel a single user's pending EVENT_REMINDER for an event.
 * Called when a user unattends an event.
 */
export async function cancelEventReminder(userId: string, eventId: string): Promise<void> {
  // findMany + updateMany by id: JSON path filters are not reliably supported
  // in Prisma's updateMany where clause, so we resolve ids first.
  const matching = await prisma.scheduledNotification.findMany({
    where: {
      userId,
      type: "EVENT_REMINDER",
      sentAt: null,
      cancelledAt: null,
      payload: { path: ["data", "eventId"], equals: eventId },
    },
    select: { id: true },
  });
  if (matching.length === 0) return;
  await prisma.scheduledNotification.updateMany({
    where: { id: { in: matching.map((n) => n.id) } },
    data: { cancelledAt: new Date() },
  });
}

/**
 * Cancel all pending EVENT_REMINDER notifications for every attendee of an event.
 * Called when an event is cancelled or deleted.
 */
export async function cancelAllRemindersForEvent(eventId: string): Promise<void> {
  const matching = await prisma.scheduledNotification.findMany({
    where: {
      type: "EVENT_REMINDER",
      sentAt: null,
      cancelledAt: null,
      payload: { path: ["data", "eventId"], equals: eventId },
    },
    select: { id: true },
  });
  if (matching.length === 0) return;
  await prisma.scheduledNotification.updateMany({
    where: { id: { in: matching.map((n) => n.id) } },
    data: { cancelledAt: new Date() },
  });
}

/**
 * Update the scheduledFor on all pending EVENT_REMINDER notifications for an event
 * when its datetime changes. Preserves each attendee's hoursBeforeEvent preference.
 * Called when an event is rescheduled.
 */
export async function rescheduleEventReminders(eventId: string, newDatetime: Date): Promise<void> {
  const pending = await prisma.scheduledNotification.findMany({
    where: {
      type: "EVENT_REMINDER",
      sentAt: null,
      cancelledAt: null,
      payload: { path: ["data", "eventId"], equals: eventId },
    },
    select: { id: true, userId: true, payload: true },
  });

  for (const notification of pending) {
    const hoursBeforeEvent = await getHoursBeforeEvent(notification.userId);
    const newScheduledFor = new Date(newDatetime.getTime() - hoursBeforeEvent * 60 * 60 * 1000);

    const existingPayload = notification.payload as {
      title: string;
      body: string;
      data: Record<string, string>;
    };

    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: {
        scheduledFor: newScheduledFor,
        payload: {
          ...existingPayload,
          data: {
            ...existingPayload.data,
            eventDatetime: newDatetime.toISOString(),
          },
        },
      },
    });
  }
}

/**
 * Update scheduledFor on all a user's pending EVENT_REMINDER notifications
 * when they change their hoursBeforeEvent preference.
 */
export async function updateReminderScheduleForUser(userId: string, newHoursBeforeEvent: number): Promise<void> {
  const pending = await prisma.scheduledNotification.findMany({
    where: {
      userId,
      type: "EVENT_REMINDER",
      sentAt: null,
      cancelledAt: null,
      scheduledFor: { gt: new Date() },
    },
    select: { id: true, payload: true },
  });

  for (const notification of pending) {
    const payload = notification.payload as {
      title: string;
      body: string;
      data: Record<string, string>;
    };

    const eventDatetime = new Date(payload.data.eventDatetime);
    const newScheduledFor = new Date(eventDatetime.getTime() - newHoursBeforeEvent * 60 * 60 * 1000);

    if (newScheduledFor <= new Date()) continue; // already past — leave it

    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: {
        scheduledFor: newScheduledFor,
        payload: {
          ...payload,
          body: `${payload.body.split(" starts")[0]} starts in ${newHoursBeforeEvent === 1 ? "1 hour" : `${newHoursBeforeEvent} hours`}`,
        },
      },
    });
  }
}
