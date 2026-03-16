import { cache } from "react";
import { prisma } from "@/lib/db";

export const getEvents = cache(async function getEvents() {
  return prisma.event.findMany({
    where: { isPast: false },
    orderBy: { createdAt: "asc" },
  });
});

export const getPastEvents = cache(async function getPastEvents() {
  return prisma.event.findMany({
    where: { isPast: true },
    orderBy: { createdAt: "asc" },
  });
});

export const getEventById = cache(async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
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
