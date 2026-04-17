"use cache";

import { cacheTag } from "next/cache";
import { prisma } from "@/lib/db";

export async function getSeries() {
  cacheTag("series");
  return prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: { where: { isPast: false, isDraft: false } } },
      },
    },
  });
}

export async function getSeriesById(id: string, currentUserId?: string) {
  cacheTag("series", `series-${id}`);
  return prisma.series.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      events: {
        where: { isPast: false, isDraft: false },
        orderBy: { datetime: "asc" },
      },
      followers: currentUserId
        ? { where: { userId: currentUserId }, select: { userId: true } }
        : { take: 0, select: { userId: true } },
      _count: { select: { followers: true } },
    },
  });
}

export async function getSeriesByCreator(userId: string) {
  cacheTag("series", `user-series-${userId}`);
  return prisma.series.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getSeriesNotByCreator(userId: string) {
  cacheTag("series");
  return prisma.series.findMany({
    where: {
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserFollowedSeries(userId: string) {
  cacheTag("series", `user-series-${userId}`);
  return prisma.series.findMany({
    where: { followers: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
    },
  });
}

export async function getSeriesForEvent(seriesId: string) {
  cacheTag("series", `series-${seriesId}`);
  return prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true, name: true, church: { select: { id: true, name: true } } },
  });
}
