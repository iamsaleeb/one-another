"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { startOfDay, endOfDay, addDays, getDay } from "date-fns";
import type { WhenFilter, TypeFilter } from "@/types/search";

export interface SearchFilters {
  query: string;
  type?: TypeFilter;
  category?: string;
  when?: WhenFilter;
}

function getDateRange(when: WhenFilter): { gte: Date; lte: Date } {
  const now = new Date();
  if (when === "today") {
    return { gte: startOfDay(now), lte: endOfDay(now) };
  }
  if (when === "tomorrow") {
    const tomorrow = addDays(now, 1);
    return { gte: startOfDay(tomorrow), lte: endOfDay(tomorrow) };
  }
  // weekend: next Saturday + Sunday
  const day = getDay(now); // 0=Sun, 6=Sat
  let daysUntilSat: number;
  if (day === 6) daysUntilSat = 0;
  else if (day === 0) daysUntilSat = 6;
  else daysUntilSat = 6 - day;
  const saturday = addDays(now, daysUntilSat);
  const sunday = addDays(saturday, 1);
  return { gte: startOfDay(saturday), lte: endOfDay(sunday) };
}

// TTL policy: profile → hours | notification preferences → minutes | search → minutes
export async function getProfileUser(userId: string) {
  cacheTag(`user-${userId}`);
  cacheLife("hours");
  return prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, dateOfBirth: true },
  });
}

export async function getStoredNotificationPreferences(userId: string) {
  cacheTag(`user-notifications-${userId}`);
  cacheLife("minutes");
  return prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, enabled: true, config: true },
  });
}

// Search results are time-sensitive (today/tomorrow/weekend filters), so use a short TTL.
export async function searchEventsAndChurches(filters: SearchFilters) {
  cacheLife("minutes");
  cacheTag("events", "churches");
  const { query, type = "all", category, when } = filters;
  if (!(query || category || when)) return { events: [], churches: [] };

  const shouldFetchEvents = type === "all" || type === "events";
  const shouldFetchChurches = type === "all" || type === "churches";

  const eventWhere: Prisma.EventWhereInput = { isPast: false, isDraft: false };
  if (query) {
    eventWhere.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
      { host: { contains: query, mode: "insensitive" } },
      { tag: { contains: query, mode: "insensitive" } },
    ];
  }
  if (category) {
    eventWhere.tag = { equals: category, mode: "insensitive" };
  }
  if (when) {
    const { gte, lte } = getDateRange(when);
    eventWhere.datetime = { gte, lte };
  }

  const churchWhere: Prisma.ChurchWhereInput = {};
  if (query) {
    churchWhere.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { address: { contains: query, mode: "insensitive" } },
    ];
  }

  const [events, churches] = await Promise.all([
    shouldFetchEvents
      ? prisma.event.findMany({
          where: eventWhere,
          include: { series: { select: { name: true } } },
          orderBy: { datetime: "asc" },
        })
      : Promise.resolve([]),
    shouldFetchChurches && (query || type === "churches")
      ? prisma.church.findMany({
          where: churchWhere,
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
  ]);

  return { events, churches };
}
