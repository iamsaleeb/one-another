"use cache";

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

export async function getChurchById(id: string, currentUserId?: string) {
  cacheTag("churches", `church-${id}`);
  cacheLife("hours");
  return prisma.church.findUnique({
    where: { id },
    include: {
      serviceTimes: true,
      events: {
        where: { isPast: false, isDraft: false },
        orderBy: { datetime: "asc" },
        take: 20,
      },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
        },
      },
      followers: currentUserId
        ? { where: { userId: currentUserId }, select: { userId: true } }
        : { take: 0, select: { userId: true } },
      _count: { select: { followers: true } },
    },
  });
}

export async function getChurchesByManager(userId: string) {
  cacheTag("churches", `user-churches-${userId}`);
  cacheLife("hours");
  const [organiserRows, adminRows] = await Promise.all([
    prisma.churchOrganiser.findMany({
      where: { userId },
      select: { church: { select: { id: true, name: true } } },
    }),
    prisma.churchAdmin.findMany({
      where: { userId },
      select: { church: { select: { id: true, name: true } } },
    }),
  ]);
  const seen = new Set<string>();
  const churches: Array<{ id: string; name: string }> = [];
  for (const row of [...organiserRows, ...adminRows]) {
    if (!seen.has(row.church.id)) {
      seen.add(row.church.id);
      churches.push(row.church);
    }
  }
  return churches.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOrganisersByChurch(churchId: string) {
  cacheTag("churches");
  cacheLife("hours");
  const assignments = await prisma.churchOrganiser.findMany({
    where: { churchId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return assignments.map((a) => a.user);
}

export async function getAdminChurches(userId: string) {
  cacheTag("churches");
  cacheLife("hours");
  const assignments = await prisma.churchAdmin.findMany({
    where: { userId },
    select: {
      church: {
        select: {
          id: true,
          name: true,
          organisers: {
            select: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { church: { name: "asc" } },
  });
  return assignments.map((a) => ({
    id: a.church.id,
    name: a.church.name,
    organisers: a.church.organisers.map((o) => o.user),
  }));
}
