"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import { upcomingPublicEvents } from "@/domains/events/lib/visibility";

// Lists count upcoming Events, which change as time passes as well as on
// writes, so they expire within minutes like the Event lists.
export async function getSeries() {
  cacheTag("series");
  cacheLife("minutes");
  return prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          events: { where: upcomingPublicEvents() },
        },
      },
    },
  });
}

export async function getSeriesById(id: string) {
  cacheTag("series", `series-${id}`);
  cacheLife("minutes");
  return prisma.series.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      events: {
        where: upcomingPublicEvents(),
        orderBy: { datetime: "asc" },
      },
      _count: { select: { followers: true } },
    },
  });
}

// Per-user series follow — short TTL, separate cache key space
export async function getMySeriesFollow(seriesId: string, userId: string) {
  cacheTag(`series-${seriesId}`, `user-follow-series-${userId}-${seriesId}`);
  cacheLife("seconds");
  return prisma.seriesFollower.findUnique({
    where: { seriesId_userId: { seriesId, userId } },
    select: { userId: true },
  });
}

export async function getSeriesNotByCreator(userId: string) {
  cacheTag("series");
  cacheLife("minutes");
  return prisma.series.findMany({
    where: {
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: {
        select: {
          events: { where: upcomingPublicEvents() },
        },
      },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserFollowedSeries(userId: string) {
  cacheTag("series", `user-series-${userId}`);
  cacheLife("minutes");
  return prisma.series.findMany({
    where: { followers: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          events: { where: upcomingPublicEvents() },
        },
      },
    },
  });
}

// Name and Church only; edits invalidate `series-${id}`.
export async function getSeriesForEvent(seriesId: string) {
  cacheTag("series", `series-${seriesId}`);
  cacheLife("hours");
  return prisma.series.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      name: true,
      church: { select: { id: true, name: true } },
    },
  });
}
