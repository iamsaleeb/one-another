import "server-only";

import { prisma } from "@/lib/db";
import { Prisma, NotificationType } from "@prisma/client";
import { parseEventMetadata } from "@/lib/validations/event";
import { scheduleEventReminderNotification, cancelNotification } from "@/lib/notifications/queue";
import { saveResponses } from "@/lib/dal/responses";
import type { ResponseInput } from "@/lib/validations/questions";
interface DalError { error: string }

export async function attendEvent(
  eventId: string,
  userId: string
): Promise<DalError | Record<string, never>> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, datetime: true, isDraft: true },
  });
  if (!event || event.isDraft) return { error: "Event not found." };

  try {
    await prisma.eventAttendee.create({ data: { eventId, userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {};
    }
    throw err;
  }

  try {
    await scheduleEventReminderNotification(userId, event);
  } catch (err) {
    console.error("Failed to schedule event reminder:", err);
  }

  return {};
}

export async function unattendEvent(
  eventId: string,
  userId: string
): Promise<DalError | Record<string, never>> {
  try {
    await prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return {};
    }
    throw err;
  }

  try {
    await cancelNotification({ userId, type: NotificationType.EVENT_REMINDER, dedupeKey: eventId });
  } catch (err) {
    console.error("Failed to cancel event reminder:", err);
  }

  return {};
}

export interface RegisterEventData {
  phone?: string;
  notes?: string;
  selectedDays?: string[];
  responses?: ResponseInput[];
}

export async function registerEvent(
  eventId: string,
  userId: string,
  data: RegisterEventData
): Promise<DalError | { success: true }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      datetime: true,
      isDraft: true,
      metadata: true,
      _count: { select: { attendees: true } },
    },
  });

  if (!event || event.isDraft) return { error: "Event not found." };

  const eventMeta = parseEventMetadata(event.metadata);
  const { capacity } = eventMeta.registration;

  // Run camp validation first so validatedSelectedDays is ready for both the
  // existing-attendee update path and the new-attendee create path.
  let validatedSelectedDays: string[] | undefined;
  if (eventMeta.camp?.allowPartialRegistration && eventMeta.camp.endDate) {
    if (!event.datetime) {
      return { error: "This camp event is missing a start date, so partial registration is unavailable." };
    }
    const startDate = event.datetime.toISOString().slice(0, 10);
    const endDate = eventMeta.camp.endDate;
    const inRange = (d: string) => d >= startDate && d <= endDate;

    const days = data.selectedDays ?? [];
    const filtered = days.filter(inRange);
    if (filtered.length === 0) {
      return { error: "Please select at least one valid day to attend." };
    }
    validatedSelectedDays = filtered;
  }

  const existingAttendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true },
  });
  if (existingAttendee) {
    await prisma.eventAttendee.update({
      where: { id: existingAttendee.id },
      data: {
        phone: data.phone,
        notes: data.notes,
        ...(validatedSelectedDays ? { metadata: { selectedDays: validatedSelectedDays } } : {}),
      },
    });
    if (data.responses && data.responses.length > 0) {
      await saveResponses(existingAttendee.id, data.responses, eventId);
    }
    return { success: true };
  }

  if (capacity != null && event._count.attendees >= capacity) {
    return { error: "Sorry, this event is fully booked." };
  }

  let attendeeId: string;
  try {
    const created = await prisma.eventAttendee.create({
      data: {
        eventId,
        userId,
        phone: data.phone,
        notes: data.notes,
        ...(validatedSelectedDays ? { metadata: { selectedDays: validatedSelectedDays } } : {}),
      },
      select: { id: true },
    });
    attendeeId = created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Race: another concurrent request registered this user — find their record and save responses
      const raced = await prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { id: true },
      });
      if (!raced) throw err;
      if (data.responses && data.responses.length > 0) {
        await saveResponses(raced.id, data.responses, eventId);
      }
      return { success: true };
    }
    throw err;
  }

  if (data.responses && data.responses.length > 0) {
    await saveResponses(attendeeId, data.responses, eventId);
  }

  try {
    await scheduleEventReminderNotification(userId, {
      id: event.id,
      title: event.title,
      datetime: event.datetime,
    });
  } catch (err) {
    console.error("Failed to schedule event reminder after registration:", err);
  }

  return { success: true };
}

