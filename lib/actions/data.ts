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

export async function getEvents() {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false },
    orderBy: { createdAt: "asc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getPastEvents() {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: true, isDraft: false },
    orderBy: { createdAt: "asc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getEventById(id: string) {
  cacheTag("events", `event-${id}`);
  return prisma.event.findUnique({
    where: { id },
    include: {
      series: { select: { id: true, name: true } },
      attendees: { select: { userId: true } },
      _count: { select: { attendees: true } },
    },
  });
}

export async function getEventAttendees(eventId: string) {
  cacheTag("events", `event-${eventId}`);
  return prisma.eventAttendee.findMany({
    where: { eventId },
    select: {
      id: true,
      phone: true,
      notes: true,
      metadata: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEventsByCreator(userId: string) {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: false, createdById: userId },
    orderBy: { createdAt: "asc" },
    include: {
      series: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getEventsNotByCreator(userId: string) {
  cacheTag("events");
  return prisma.event.findMany({
    where: {
      isPast: false,
      isDraft: false,
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      series: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserAttendedEvents(userId: string) {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "asc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getUserAttendedPastEvents(userId: string) {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: true, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "desc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getChurches() {
  cacheTag("churches");
  return prisma.church.findMany({
    include: {
      serviceTimes: true,
      events: { where: { isPast: false, isDraft: false } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getChurchById(id: string) {
  cacheTag("churches", `church-${id}`);
  return prisma.church.findUnique({
    where: { id },
    include: {
      serviceTimes: true,
      events: { where: { isPast: false, isDraft: false } },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
        },
      },
      followers: { select: { userId: true } },
      _count: { select: { followers: true } },
    },
  });
}

export async function getChurchesByAdmin(userId: string) {
  cacheTag("churches");
  const assignments = await prisma.churchAdmin.findMany({
    where: { userId },
    select: { church: { select: { id: true, name: true } } },
    orderBy: { church: { name: "asc" } },
  });
  return assignments.map((a) => a.church);
}

export async function getChurchesByManager(userId: string) {
  cacheTag("churches");
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

export async function getChurchesByOrganiser(userId: string) {
  cacheTag("churches");
  const assignments = await prisma.churchOrganiser.findMany({
    where: { userId },
    select: { church: { select: { id: true, name: true } } },
    orderBy: { church: { name: "asc" } },
  });
  return assignments.map((a) => a.church);
}

export async function getOrganisersByChurch(churchId: string) {
  cacheTag("churches");
  const assignments = await prisma.churchOrganiser.findMany({
    where: { churchId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return assignments.map((a) => a.user);
}

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

export async function getSeriesById(id: string) {
  cacheTag("series", `series-${id}`);
  return prisma.series.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      events: {
        where: { isPast: false, isDraft: false },
        orderBy: { datetime: "asc" },
      },
      followers: { select: { userId: true } },
      _count: { select: { followers: true } },
    },
  });
}

export async function getSeriesByChurchId(churchId: string) {
  cacheTag("series");
  return prisma.series.findMany({
    where: { churchId },
    include: {
      _count: {
        select: { events: { where: { isPast: false, isDraft: false } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSeriesByCreator(userId: string) {
  cacheTag("series");
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
    include: {
      _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserFollowedSeries(userId: string) {
  cacheTag("series");
  return prisma.series.findMany({
    where: { followers: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
    },
  });
}

export async function getStoredNotificationPreferences(userId: string) {
  cacheTag(`user-notifications-${userId}`);
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
  const hasFilters = !!(query || category || when);

  if (!hasFilters) return { events: [], churches: [] };

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
      ? prisma.church.findMany({ where: churchWhere })
      : Promise.resolve([]),
  ]);

  return { events, churches };
}
