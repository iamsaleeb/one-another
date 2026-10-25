import "server-only";

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import {
  seriesSubject,
  type Action,
  type AppAbility,
} from "@/domains/roles/lib/ability";
import {
  missingOrForbidden,
  resolveWrite,
  scopedTo as scopedToType,
  type WriteOptions,
} from "@/domains/roles/lib/scoped-writes";
import { seriesDeleted, type LifecycleError } from "@/domains/events/lifecycle";
import type {
  CreateSeriesInput,
  UpdateSeriesInput,
} from "./validations/series";

// The Series lifecycle (see GLOSSARY.md): every change to a Series, and
// everything that must follow from it. A change commits together with what it
// does to the Series' Events; the pages it made stale are invalidated once it
// has committed. Callers say what happened and never clean up after it.

type Done = Record<string, never>;

const SIGNED_OUT = "You must be signed in.";

function failed<T extends object>(
  result: T | LifecycleError
): result is LifecycleError {
  return "error" in result || "fieldErrors" in result;
}

// ---------------------------------------------------------------------------
// Permission-scoped reads

function scopedTo(ability: AppAbility, action: Action, id: string) {
  return scopedToType(ability, action, "Series", id);
}

// Loads a Series the Ability may act on, telling "missing" apart from
// "forbidden" only after the scoped read has failed.
async function findForAction(
  db: Db,
  ability: AppAbility,
  action: Action,
  id: string
): Promise<{ churchId: string } | { error: string }> {
  const series = await db.series.findFirst({
    where: scopedTo(ability, action, id),
    select: { churchId: true },
  });
  if (series) return series;
  return missingOrForbidden(await db.series.count({ where: { id } }), "Series");
}

// ---------------------------------------------------------------------------
// Stale pages

interface Stale {
  id: string;
  churchIds: string[];
  // The Series joined or left the public lists.
  listsChanged?: boolean;
}

function invalidate({ id, churchIds, listsChanged }: Stale) {
  const tags = new Set(["series", `series-${id}`]);
  if (listsChanged) {
    tags.add("events-list");
    tags.add("churches");
  }
  churchIds.forEach((c) => tags.add(`church-${c}`));
  tags.forEach((tag) => updateTag(tag));
}

// Follow state is not part of the Series lists, so those stay fresh.
function invalidateFollowing(seriesId: string, userId: string) {
  updateTag(`series-${seriesId}`);
  updateTag(`user-series-${userId}`);
  updateTag(`user-follow-series-${userId}-${seriesId}`);
}

// ---------------------------------------------------------------------------
// Transitions

function fields(input: UpdateSeriesInput) {
  const { name, description, cadence, location, host, tag, photoUrl } = input;
  return {
    name,
    description,
    cadence,
    location,
    host,
    tag,
    photoUrl: photoUrl ?? null,
  };
}

export async function createSeries(
  input: CreateSeriesInput,
  opts?: WriteOptions
): Promise<LifecycleError | { id: string }> {
  const { ability, userId } = await resolveWrite(opts);
  const { churchId } = input;
  if (!ability.can("create", seriesSubject({ churchId })))
    return { error: "Unauthorised." };

  const { id } = await prisma.series.create({
    data: { ...fields(input), churchId, createdById: userId },
    select: { id: true },
  });

  invalidate({ id, churchIds: [churchId], listsChanged: true });
  return { id };
}

// Every save of a Series' form. A Series stays in the Church it was created
// in, so a save never moves it or its Events.
export async function saveSeries(
  id: string,
  input: UpdateSeriesInput,
  opts?: WriteOptions
): Promise<LifecycleError | Done> {
  const { ability } = await resolveWrite(opts);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await findForAction(tx, ability, "update", id);
    if ("error" in existing) return existing;

    await tx.series.update({
      where: scopedTo(ability, "update", id),
      data: fields(input),
    });
    return existing;
  });
  if (failed(result)) return result;

  invalidate({ id, churchIds: [result.churchId] });
  return {};
}

// Its Events stay, as standalone Events in the same Church.
export async function deleteSeries(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { ability } = await resolveWrite(opts);

  const result = await prisma.$transaction(async (tx) => {
    const series = await findForAction(tx, ability, "delete", id);
    if ("error" in series) return series;

    const afterCommit = await seriesDeleted(tx, id);
    await tx.series.delete({ where: scopedTo(ability, "delete", id) });
    return { churchId: series.churchId, afterCommit };
  });
  if ("error" in result) return result;

  result.afterCommit();
  invalidate({ id, churchIds: [result.churchId], listsChanged: true });
  return {};
}

// Following again changes nothing.
export async function followSeries(
  seriesId: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { userId } = await resolveWrite(opts);
  if (!userId) return { error: SIGNED_OUT };

  try {
    await prisma.seriesFollower.createMany({
      data: [{ seriesId, userId }],
      skipDuplicates: true,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    )
      return { error: "Series not found." };
    throw err;
  }

  invalidateFollowing(seriesId, userId);
  return {};
}

// Unfollowing a Series the user does not follow changes nothing.
export async function unfollowSeries(
  seriesId: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { userId } = await resolveWrite(opts);
  if (!userId) return { error: SIGNED_OUT };

  await prisma.seriesFollower.deleteMany({ where: { seriesId, userId } });

  invalidateFollowing(seriesId, userId);
  return {};
}
