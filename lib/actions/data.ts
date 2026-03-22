import { cache } from "react";
import { prisma } from "@/lib/db";

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
    include: { series: { select: { id: true, name: true } } },
  });
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
    },
  });
});

export async function searchEventsAndChurches(query: string) {
  const [events, churches] = await Promise.all([
    prisma.event.findMany({
      where: {
        isPast: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { host: { contains: query, mode: "insensitive" } },
          { tag: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { series: { select: { name: true } } },
    }),
    prisma.church.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { denomination: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
        ],
      },
    }),
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
