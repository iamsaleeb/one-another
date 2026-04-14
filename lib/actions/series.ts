"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createSeriesSchema, type CreateSeriesInput } from "@/lib/validations/series";
import { canManageChurch } from "@/lib/permissions";
import type { ActionResult } from "@/lib/actions/auth";

export async function createSeriesAction(data: CreateSeriesInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    return { error: "Unauthorised." };
  }

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, description, cadence, location, host, tag, churchId, photoUrl } = parsed.data;

  const allowed = await canManageChurch(session.user.id, session.user.role, churchId);
  if (!allowed) return { error: "You are not assigned to this church." };

  const created = await prisma.series.create({
    data: {
      name,
      description,
      cadence,
      location,
      host,
      tag,
      churchId,
      photoUrl: photoUrl ?? null,
      ...(session?.user?.id ? { createdById: session.user.id } : {}),
    },
  });

  updateTag("series");
  redirect(`/series/${created.id}`);
}

export async function updateSeriesAction(id: string, data: CreateSeriesInput): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, description, cadence, location, host, tag, churchId, photoUrl } = parsed.data;

  const existing = await prisma.series.findUnique({ where: { id }, select: { churchId: true } });
  if (!existing) redirect("/organiser");

  const allowedOriginal = await canManageChurch(session.user.id, session.user.role, existing.churchId);
  if (!allowedOriginal) redirect("/");

  if (churchId !== existing.churchId) {
    const allowedNew = await canManageChurch(session.user.id, session.user.role, churchId);
    if (!allowedNew) redirect("/");
  }

  await prisma.series.update({
    where: { id },
    data: { name, description, cadence, location, host, tag, churchId, photoUrl: photoUrl ?? null },
  });

  updateTag("series");
  updateTag(`series-${id}`);
  redirect(`/series/${id}`);
}

export interface FollowSeriesState {
  error?: string;
}

export async function followSeriesAction(seriesId: string): Promise<FollowSeriesState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.create({
      data: { seriesId, userId: session.user.id },
    });
  } catch {
    return { error: "Failed to follow series." };
  }

  updateTag("series");
  updateTag(`series-${seriesId}`);
  return {};
}

export async function unfollowSeriesAction(seriesId: string): Promise<FollowSeriesState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.delete({
      where: { seriesId_userId: { seriesId, userId: session.user.id } },
    });
  } catch {
    return { error: "Failed to unfollow series." };
  }

  updateTag("series");
  updateTag(`series-${seriesId}`);
  return {};
}

export async function deleteSeriesAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");

  const series = await prisma.series.findUnique({ where: { id }, select: { churchId: true } });
  if (!series) redirect("/organiser");

  const allowed = await canManageChurch(session.user.id, session.user.role, series.churchId);
  if (!allowed) redirect("/");

  await prisma.series.delete({ where: { id } });
  updateTag("series");
  updateTag(`series-${id}`);
  redirect("/organiser");
}
