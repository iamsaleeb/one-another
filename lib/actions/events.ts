"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createEventSchema } from "@/lib/validations/event";
import { isOrganiserForChurch } from "@/lib/permissions";

export interface CreateEventState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createEventAction(
  _prevState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER) return { error: "Unauthorised." };
  const raw = {
    title: formData.get("title"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location"),
    host: formData.get("host"),
    tag: formData.get("tag"),
    description: formData.get("description"),
    churchId: formData.get("churchId") || undefined,
    seriesId: formData.get("seriesId") || undefined,
  };

  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { title, date, time, location, host, tag, description, seriesId } = parsed.data;
  let { churchId } = parsed.data;

  const datetime = new Date(`${date}T${time}`);

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  const allowed = await isOrganiserForChurch(session.user.id, churchId);
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
      churchId,
      ...(seriesId ? { seriesId } : {}),
      ...(session?.user?.id ? { createdById: session.user.id } : {}),
    },
  });

  redirect(seriesId ? `/series/${seriesId}` : "/my-events");
}

export async function updateEventAction(
  id: string,
  _prevState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");

  const raw = {
    title: formData.get("title"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location"),
    host: formData.get("host"),
    tag: formData.get("tag"),
    description: formData.get("description"),
    churchId: formData.get("churchId") || undefined,
    seriesId: formData.get("seriesId") || undefined,
  };

  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { title, date, time, location, host, tag, description, seriesId } = parsed.data;
  let { churchId } = parsed.data;
  const datetime = new Date(`${date}T${time}`);

  if (seriesId) {
    const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { churchId: true } });
    churchId = series?.churchId;
  }

  if (!churchId) {
    return { fieldErrors: { churchId: ["Church is required"] } };
  }

  const allowed = await isOrganiserForChurch(session.user.id, churchId);
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
      churchId,
      seriesId: seriesId ?? null,
    },
  });

  redirect(`/events/${id}`);
}

export async function deleteEventAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");

  const event = await prisma.event.findUnique({ where: { id }, select: { churchId: true } });
  if (!event) redirect("/organiser");

  const allowed = await isOrganiserForChurch(session.user.id, event.churchId);
  if (!allowed) redirect("/");

  await prisma.event.delete({ where: { id } });
  redirect("/organiser");
}
