"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema, registerEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { canManageChurch } from "@/lib/permissions";
import type { ActionResult } from "@/lib/actions/auth";

export async function createEventAction(data: CreateEventInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, date, time, location, host, tag, description, seriesId, requiresRegistration, capacity, collectPhone, collectNotes, price } = parsed.data;
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

  await prisma.event.create({
    data: {
      title,
      datetime,
      location,
      host,
      tag,
      description,
      isPast: false,
      requiresRegistration: requiresRegistration ?? false,
      capacity: requiresRegistration ? (capacity ?? null) : null,
      collectPhone: requiresRegistration ? (collectPhone ?? false) : false,
      collectNotes: requiresRegistration ? (collectNotes ?? false) : false,
      price: price ?? null,
      churchId,
      ...(seriesId ? { seriesId } : {}),
      ...(session?.user?.id ? { createdById: session.user.id } : {}),
    },
  });

  revalidatePath("/");
  redirect(seriesId ? `/series/${seriesId}` : "/my-events");
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
  const datetime = new Date(`${date}T${time}`);

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  const allowed = await canManageChurch(session.user.id, session.user.role, churchId);
  if (!allowed) redirect("/");

  await prisma.event.update({
    where: { id },
    data: {
      title,
      datetime,
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

  revalidatePath("/");
  redirect(`/events/${id}`);
}

export async function cancelEventAction(id: string, reason: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

  await prisma.event.update({
    where: { id },
    data: { cancelledAt: new Date(), cancellationReason: reason },
  });

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

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, event.churchId);
  if (!allowed) redirect("/");

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

  revalidatePath(`/events/${eventId}`);
  return {};
}

export async function unattendEventAction(eventId: string): Promise<AttendEventState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  await prisma.eventAttendee.delete({
    where: { eventId_userId: { eventId, userId: session.user.id } },
  });

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
    select: { capacity: true, _count: { select: { attendees: true } } },
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

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
