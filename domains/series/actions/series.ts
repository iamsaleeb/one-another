"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { churchPolicy } from "@/domains/roles/policies/church";
import { prisma } from "@/lib/db";
import {
  createSeriesSchema,
  type CreateSeriesInput,
} from "../validations/series";
import { createSeries, updateSeries, deleteSeries } from "../dal/series";
import type { ActionResult } from "@/lib/types/action";
import {
  broadcastSeriesChange,
  invalidateSeriesFields,
  invalidateSeriesFollowing,
} from "../cache";

export async function createSeriesAction(
  data: CreateSeriesInput
): Promise<ActionResult> {
  const session = await auth();
  const claims = sessionToClaims(session);
  if (!claims) return { error: "Unauthorised." };

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createSeries(parsed.data, session!.user.id, claims);
  if ("error" in result || "fieldErrors" in result) return result;

  broadcastSeriesChange(result.id, result.churchId);
  redirect(`/series/${result.id}`);
}

export async function updateSeriesAction(
  id: string,
  data: CreateSeriesInput
): Promise<ActionResult> {
  const session = await auth();
  const claims = sessionToClaims(session);
  if (!claims) redirect("/");

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateSeries(id, parsed.data, session!.user.id, claims);
  if ("error" in result || "fieldErrors" in result) redirect("/organiser");

  invalidateSeriesFields(id, result.oldChurchId);
  if (result.newChurchId !== result.oldChurchId)
    updateTag(`church-${result.newChurchId}`);
  redirect(`/series/${id}`);
}

export interface FollowSeriesState {
  error?: string;
}

export async function followSeriesAction(
  seriesId: string
): Promise<FollowSeriesState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.create({
      data: { seriesId, userId: session!.user.id },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {};
    }
    return { error: "Failed to follow series." };
  }

  invalidateSeriesFollowing(seriesId, session!.user.id);
  return {};
}

export async function unfollowSeriesAction(
  seriesId: string
): Promise<FollowSeriesState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.delete({
      where: { seriesId_userId: { seriesId, userId: session!.user.id } },
    });
  } catch {
    return { error: "Failed to unfollow series." };
  }

  invalidateSeriesFollowing(seriesId, session!.user.id);
  return {};
}

export async function deleteSeriesAction(id: string): Promise<void> {
  const session = await auth();
  const claims = sessionToClaims(session);
  if (!claims) redirect("/");

  const result = await deleteSeries(id, session!.user.id, claims);
  if ("error" in result) redirect("/organiser");

  broadcastSeriesChange(id, result.churchId);
  redirect("/organiser");
}
