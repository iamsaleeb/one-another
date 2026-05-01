"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

export async function getEvents() {
  cacheTag("events");
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false },
    orderBy: { createdAt: "asc" },
    include: { church: { select: { name: true } } },
  });
}

export async function getEventById(id: string, currentUserId?: string) {
  cacheTag("events", `event-${id}`);
  cacheLife("hours");
  return prisma.event.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
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
  cacheLife("minutes");
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
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { isPast: false, createdById: userId },
    orderBy: { createdAt: "asc" },
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getEventsNotByCreator(userId: string) {
  cacheTag("events");
  cacheLife("minutes");
  return prisma.event.findMany({
    where: {
      isPast: false,
      isDraft: false,
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { datetime: "asc" },
    take: 50,
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getUserAttendedEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { isPast: false, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "asc" },
    include: { church: { select: { name: true } } },
  });
}

export async function getUserAttendedPastEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("hours");
  return prisma.event.findMany({
    where: { isPast: true, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "desc" },
    include: { church: { select: { name: true } } },
  });
}
