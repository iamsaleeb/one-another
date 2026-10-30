"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import { upcomingPublicEvents } from "@/domains/events/lib/visibility";
import type { Prisma } from "@prisma/client";
import type { WhenFilter, TypeFilter } from "@/lib/types/search";
import { whenRange } from "@/lib/search-range";

export interface SearchFilters {
  query: string;
  type?: TypeFilter;
  category?: string;
  when?: WhenFilter;
  // The searcher's IANA timezone, which "today" and "this weekend" are in.
  timeZone?: string;
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
  cacheTag("events-list", "churches");
  const { query, type = "all", category, when } = filters;
  if (!(query || category || when)) return { events: [], churches: [] };

  const shouldFetchEvents = type === "all" || type === "events";
  const shouldFetchChurches = type === "all" || type === "churches";

  const eventWhere: Prisma.EventWhereInput = {
    ...upcomingPublicEvents(),
  };
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
    eventWhere.datetime = whenRange(when, filters.timeZone);
  }

  const churchWhere: Prisma.ChurchWhereInput = {};
  if (query) {
    churchWhere.OR = [
      { name: { contains: query, mode: "insensitive" } },
      {
        address: {
          OR: [
            { street: { contains: query, mode: "insensitive" } },
            { suburb: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { postcode: { contains: query, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [events, churches] = await Promise.all([
    shouldFetchEvents
      ? prisma.event.findMany({
          where: eventWhere,
          include: { church: { select: { name: true } } },
          orderBy: { datetime: "asc" },
        })
      : Promise.resolve([]),
    shouldFetchChurches && (query || type === "churches")
      ? prisma.church.findMany({
          where: churchWhere,
          select: {
            id: true,
            name: true,
            address: { select: { suburb: true, city: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return { events, churches };
}
