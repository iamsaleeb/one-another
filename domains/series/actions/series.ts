"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { getActor } from "@/domains/roles/lib/session";
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
  const actor = await getActor();
  if (!actor) return { error: "Unauthorised." };

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createSeries(parsed.data, actor.id, actor);
  if ("error" in result || "fieldErrors" in result) return result;

  broadcastSeriesChange(result.id, result.churchId);
  redirect(`/series/${result.id}`);
}

export async function updateSeriesAction(
  id: string,
  data: CreateSeriesInput
): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await updateSeries(id, parsed.data, actor.id, actor);
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
  const actor = await getActor();
  if (!actor) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.create({
      data: { seriesId, userId: actor.id },
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

  invalidateSeriesFollowing(seriesId, actor.id);
  return {};
}

export async function unfollowSeriesAction(
  seriesId: string
): Promise<FollowSeriesState> {
  const actor = await getActor();
  if (!actor) return { error: "You must be signed in." };

  try {
    await prisma.seriesFollower.delete({
      where: { seriesId_userId: { seriesId, userId: actor.id } },
    });
  } catch {
    return { error: "Failed to unfollow series." };
  }

  invalidateSeriesFollowing(seriesId, actor.id);
  return {};
}

export async function deleteSeriesAction(id: string): Promise<void> {
  const actor = await getActor();
  if (!actor) redirect("/");

  const result = await deleteSeries(id, actor.id, actor);
  if ("error" in result) redirect("/organiser");

  broadcastSeriesChange(id, result.churchId);
  redirect("/organiser");
}
