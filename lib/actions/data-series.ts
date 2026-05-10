"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

export async function getSeries() {
  cacheTag("series");
  return prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } },
      },
    },
  });
}

export async function getSeriesById(id: string) {
  cacheTag("series", `series-${id}`);
  cacheLife("hours");
  return prisma.series.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      events: {
        where: { datetime: { gte: new Date() }, isDraft: false },
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

export async function getSeriesByCreator(userId: string) {
  cacheTag("series", `user-series-${userId}`);
  return prisma.series.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } },
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
      _count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } },
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
      _count: { select: { events: { where: { datetime: { gte: new Date() }, isDraft: false } } } },
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
