"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import { upcomingPublicEvents } from "@/domains/events/lib/visibility";

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
        where: upcomingPublicEvents(),
        orderBy: { datetime: "asc" },
        take: 20,
      },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              events: {
                where: upcomingPublicEvents(),
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

// Churches with their organisers, for the admin screen. Which Churches a user
// may manage is decided by the caller via getChurchTargets("manage_members").
export async function getChurchesWithOrganisers(churchIds: string[]) {
  if (churchIds.length === 0) return [];
  cacheTag("churches");
  cacheLife("hours");
  const churches = await prisma.church.findMany({
    where: { id: { in: churchIds } },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { role: "EVENT_MANAGER" },
        select: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });
  return churches.map((c) => ({
    id: c.id,
    name: c.name,
    organisers: c.memberships.map((mb) => mb.user),
  }));
}
