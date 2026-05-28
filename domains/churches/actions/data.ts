"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

// TTL policy: church list → hours (churches rarely added/removed)
//             church detail → hours (content changes infrequently)
export async function getChurches() {
  cacheTag("churches");
  cacheLife("hours");
  return prisma.church.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getChurchById(id: string) {
  cacheTag("churches", `church-${id}`);
  cacheLife("minutes");
  return prisma.church.findUnique({
    where: { id },
    include: {
      serviceTimes: true,
      events: {
        where: { datetime: { gte: new Date() }, isDraft: false },
        orderBy: { datetime: "asc" },
        take: 20,
      },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              events: {
                where: { datetime: { gte: new Date() }, isDraft: false },
              },
            },
          },
        },
      },
      _count: { select: { followers: true } },
    },
  });
}

// Per-user follow status — short TTL, separate cache key space
export async function getMyChurchFollow(churchId: string, userId: string) {
  cacheTag(`church-${churchId}`, `user-follow-church-${userId}-${churchId}`);
  cacheLife("seconds");
  return prisma.churchFollower.findUnique({
    where: { churchId_userId: { churchId, userId } },
    select: { userId: true },
  });
}

export async function getChurchesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  cacheTag("churches");
  cacheLife("hours");
  return prisma.church.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getOrganisersByChurch(churchId: string) {
  cacheTag("churches");
  cacheLife("hours");
  const memberships = await prisma.churchMembership.findMany({
    where: { churchId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return memberships.map((m) => m.user);
}

export async function getAdminChurches(userId: string) {
  cacheTag("churches");
  cacheLife("hours");
  const memberships = await prisma.churchMembership.findMany({
    where: { userId, role: "CHURCH_ADMIN" },
    select: {
      church: {
        select: {
          id: true,
          name: true,
          memberships: {
            where: { role: "EVENT_MANAGER" },
            select: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { church: { name: "asc" } },
  });
  return memberships.map((m) => ({
    id: m.church.id,
    name: m.church.name,
    organisers: m.church.memberships.map((mb) => mb.user),
  }));
}
