import { cache } from "react";
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

export const getEvents = cache(async function getEvents() {
  return prisma.event.findMany({
    where: { isPast: false },
    orderBy: { createdAt: "asc" },
    include: { series: { select: { name: true } } },
  });
});

export const getPastEvents = cache(async function getPastEvents() {
  return prisma.event.findMany({
    where: { isPast: true },
    orderBy: { createdAt: "asc" },
    include: { series: { select: { name: true } } },
  });
});

export const getEventById = cache(async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      series: { select: { id: true, name: true } },
      attendees: { select: { userId: true } },
      _count: { select: { attendees: true } },
    },
  });
});

export const getChurchesByAdmin = cache(async function getChurchesByAdmin(userId: string) {
  const assignments = await prisma.churchAdmin.findMany({
    where: { userId },
    select: { church: { select: { id: true, name: true } } },
    orderBy: { church: { name: "asc" } },
  });
  return assignments.map((a) => a.church);
});

export const getOrganisersByChurch = cache(async function getOrganisersByChurch(churchId: string) {
  const assignments = await prisma.churchOrganiser.findMany({
    where: { churchId },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return assignments.map((a) => a.user);
});

export const getChurchesByManager = cache(async function getChurchesByManager(userId: string) {
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
});

export const getChurchesByOrganiser = cache(async function getChurchesByOrganiser(userId: string) {
  const assignments = await prisma.churchOrganiser.findMany({
    where: { userId },
    select: { church: { select: { id: true, name: true } } },
    orderBy: { church: { name: "asc" } },
  });
  return assignments.map((a) => a.church);
});

export const getChurches = cache(async function getChurches() {
  return prisma.church.findMany({
    include: {
      serviceTimes: true,
      events: { where: { isPast: false } },
    },
    orderBy: { name: "asc" },
  });
});

export const getChurchById = cache(async function getChurchById(id: string) {
  return prisma.church.findUnique({
    where: { id },
    include: {
      serviceTimes: true,
      events: { where: { isPast: false } },
      series: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { events: { where: { isPast: false } } } },
        },
      },
      followers: { select: { userId: true } },
      _count: { select: { followers: true } },
    },
  });
});

export async function searchEventsAndChurches(filters: SearchFilters) {
  const { query, type = "all", category, when } = filters;
  const hasFilters = !!(query || category || when);

  if (!hasFilters) return { events: [], churches: [] };

  const shouldFetchEvents = type === "all" || type === "events";
  const shouldFetchChurches = type === "all" || type === "churches";

  // Build event where clause
  const eventWhere: Prisma.EventWhereInput = { isPast: false };
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

  // Build church where clause
  const churchWhere: Prisma.ChurchWhereInput = {};
  if (query) {
    churchWhere.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { denomination: { contains: query, mode: "insensitive" } },
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

export const getSeries = cache(async function getSeries() {
  return prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: { where: { isPast: false } } },
      },
    },
  });
});

export const getSeriesById = cache(async function getSeriesById(id: string) {
  return prisma.series.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      events: {
        where: { isPast: false },
        orderBy: { datetime: "asc" },
      },
    },
  });
});

export const getSeriesByChurchId = cache(async function getSeriesByChurchId(churchId: string) {
  return prisma.series.findMany({
    where: { churchId },
    include: {
      _count: {
        select: { events: { where: { isPast: false } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
});

export const getEventsByCreator = cache(async function getEventsByCreator(userId: string) {
  return prisma.event.findMany({
    where: { isPast: false, createdById: userId },
    orderBy: { createdAt: "asc" },
    include: {
      series: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
});

export const getSeriesByCreator = cache(async function getSeriesByCreator(userId: string) {
  return prisma.series.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { isPast: false } } } },
      createdBy: { select: { name: true } },
    },
  });
});

export const getEventsNotByCreator = cache(async function getEventsNotByCreator(userId: string) {
  return prisma.event.findMany({
    where: {
      isPast: false,
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      series: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
});

export const getEventAttendees = cache(async function getEventAttendees(eventId: string) {
  return prisma.eventAttendee.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
});

export const getSeriesNotByCreator = cache(async function getSeriesNotByCreator(userId: string) {
  return prisma.series.findMany({
    where: {
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: { isPast: false } } } },
      createdBy: { select: { name: true } },
    },
  });
});
