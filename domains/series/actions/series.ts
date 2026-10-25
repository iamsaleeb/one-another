"use server";

import { redirect } from "next/navigation";
import { getSessionUserId } from "@/domains/roles/lib/get-ability";
import {
  createSeriesSchema,
  type CreateSeriesInput,
} from "../validations/series";
import {
  createSeries,
  saveSeries,
  deleteSeries,
  followSeries,
  unfollowSeries,
} from "../lifecycle";
import type { ActionResult } from "@/lib/types/action";

export async function createSeriesAction(
  data: CreateSeriesInput
): Promise<ActionResult> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createSeries(parsed.data);
  if ("error" in result || "fieldErrors" in result) return result;

  redirect(`/series/${result.id}`);
}

export async function updateSeriesAction(
  id: string,
  data: CreateSeriesInput
): Promise<ActionResult> {
  if (!(await getSessionUserId())) return { error: "Unauthorised." };

  const parsed = createSeriesSchema.safeParse(data);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await saveSeries(id, parsed.data);
  if ("error" in result || "fieldErrors" in result) return result;

  redirect(`/series/${id}`);
}

export interface FollowSeriesState {
  error?: string;
}

export async function followSeriesAction(
  seriesId: string
): Promise<FollowSeriesState> {
  return followSeries(seriesId);
}

export async function unfollowSeriesAction(
  seriesId: string
): Promise<FollowSeriesState> {
  return unfollowSeries(seriesId);
}

export async function deleteSeriesAction(id: string): Promise<void> {
  if (!(await getSessionUserId())) redirect("/");

  const result = await deleteSeries(id);
  if ("error" in result) redirect("/organiser");

  redirect("/organiser");
}
