"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, registerEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { canManageChurch } from "@/lib/permissions";
import type { ActionResult } from "@/lib/actions/auth";
import {
  scheduleEventReminder,
  cancelEventReminder,
  cancelAllRemindersForEvent,
  rescheduleEventReminders,
} from "@/lib/schedule-notification";
import { sendPushToUsers } from "@/lib/notifications";

export async function createEventAction(data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, date, time, location, host, tag, description, seriesId, requiresRegistration, capacity, collectPhone, collectNotes, price, isDraft } = parsed.data;
  let { churchId } = parsed.data;

  const datetime = new Date(`${date}T${time}`);

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  const allowed = await canManageChurch(session.user.id, session.user.role, churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

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
      capacity: requiresRegistration ? (capacity ?? null) : null,
      collectPhone: requiresRegistration ? (collectPhone ?? false) : false,
      collectNotes: requiresRegistration ? (collectNotes ?? false) : false,
      price: price ?? null,
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

  revalidatePath("/");
  redirect(isDraft ? "/organiser" : seriesId ? `/series/${seriesId}` : "/my-events");
}

export async function updateEventAction(id: string, data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, date, time, location, host, tag, description, seriesId, requiresRegistration, capacity, collectPhone, collectNotes, price } = parsed.data;
  let { churchId } = parsed.data;
  const newDatetime = new Date(`${date}T${time}`);

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
    select: { churchId: true, datetime: true, title: true, isDraft: true },
  });
  if (!existing) redirect("/organiser");

  const allowedOriginal = await canManageChurch(session.user.id, session.user.role, existing.churchId);
  if (!allowedOriginal) redirect("/");

  if (churchId !== existing.churchId) {
    const allowedNew = await canManageChurch(session.user.id, session.user.role, churchId);
    if (!allowedNew) redirect("/");
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
      capacity: requiresRegistration ? (capacity ?? null) : null,
      collectPhone: requiresRegistration ? (collectPhone ?? false) : false,
      collectNotes: requiresRegistration ? (collectNotes ?? false) : false,
      price: price ?? null,
      churchId,
      seriesId: seriesId ?? null,
    },
  });

  if (existing && newDatetime.getTime() !== existing.datetime.getTime()) {
    try {
      await rescheduleEventReminders(id, newDatetime);

      const attendees = await prisma.eventAttendee.findMany({
        where: { eventId: id },
        select: { userId: true },
      });
      const userIds = attendees.map((a) => a.userId);
      if (userIds.length > 0) {
        await sendPushToUsers(
          userIds,
          "EVENT_POSTPONED",
          "Event Rescheduled",
          `${title} has been moved to a new time`,
          { type: "event_postponed", eventId: id }
        );
      }
    } catch (err) {
      console.error("EVENT_POSTPONED push failed:", err);
    }
  }

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function cancelEventAction(id: string, reason: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, title: true },
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

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function uncancelEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: null, cancellationReason: null },
  });

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function publishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: { churchId: true, seriesId: true, title: true },
  });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  await prisma.event.update({ where: { id }, data: { isDraft: false } });

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

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function unpublishEventAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  await prisma.event.update({ where: { id }, data: { isDraft: true } });

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  try {
    await cancelAllRemindersForEvent(id);
  } catch (err) {
    console.error("Failed to cancel reminders before delete:", err);
  }

  await prisma.event.delete({ where: { id } });
  revalidatePath("/");
  redirect("/organiser");
}

export interface AttendEventState {
  error?: string;
}

export async function attendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await prisma.eventAttendee.create({
    data: { eventId, userId: session.user.id },
  });

  // Schedule an EVENT_REMINDER for this user
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, datetime: true },
    });
    if (event) {
      await scheduleEventReminder(session.user.id, event);
    }
  } catch (err) {
    console.error("Failed to schedule event reminder:", err);
  }

  revalidatePath(`/events/${eventId}`);
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

  revalidatePath(`/events/${eventId}`);
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

  const parsed = registerEventSchema.safeParse({
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: "Invalid form data." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, datetime: true, capacity: true, _count: { select: { attendees: true } } },
  });

  if (event?.capacity != null && event._count.attendees >= event.capacity) {
    return { error: "Sorry, this event is fully booked." };
  }

  await prisma.eventAttendee.create({
    data: {
      eventId,
      userId: session.user.id,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    },
  });

  // Schedule an EVENT_REMINDER for this user
  try {
    if (event) {
      await scheduleEventReminder(session.user.id, {
        id: event.id,
        title: event.title,
        datetime: event.datetime,
      });
    }
  } catch (err) {
    console.error("Failed to schedule event reminder after registration:", err);
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
