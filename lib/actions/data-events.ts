"use cache";

import { cacheTag } from "next/cache";
import { prisma } from "@/lib/db";

export async function getEvents() {
  cacheTag("events");
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false },
    orderBy: { createdAt: "asc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getEventById(id: string, currentUserId?: string) {
  cacheTag("events", `event-${id}`);
  return prisma.event.findUnique({
    where: { id },
    include: {
      series: { select: { id: true, name: true } },
      attendees: currentUserId
        ? { where: { userId: currentUserId }, select: { userId: true } }
        : { take: 0, select: { userId: true } },
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
  cacheTag("events", `user-events-${userId}`);
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
    orderBy: { datetime: "asc" },
    take: 50,
    include: {
      series: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserAttendedEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "asc" },
    include: { series: { select: { name: true } } },
  });
}

export async function getUserAttendedPastEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  return prisma.event.findMany({
    where: { isPast: true, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "desc" },
    include: { series: { select: { name: true } } },
  });
}
