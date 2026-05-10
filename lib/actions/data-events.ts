"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

// TTL policy: event lists → minutes (change on new events/RSVPs)
//             event detail → hours (changes infrequently once published)
export async function getEvents() {
  cacheTag("events");
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { datetime: { gte: new Date() }, isDraft: false },
    orderBy: { datetime: "asc" },
    take: 50,
    include: { church: { select: { name: true } } },
  });
}

export async function getEventById(id: string) {
  cacheTag("events", `event-${id}`);
  cacheLife("hours");
  return prisma.event.findUnique({
    where: { id },
    include: {
      church: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
      _count: { select: { attendees: true } },
    },
  });
}

export async function getEventMeta(id: string) {
  cacheTag(`event-${id}`);
  cacheLife("hours");
  return prisma.event.findUnique({
    where: { id },
    select: { title: true, isDraft: true, churchId: true },
  });
}

// Per-user attendance — short TTL, separate cache key space
export async function getMyEventAttendance(eventId: string, userId: string) {
  cacheTag(`event-${eventId}`, `user-attendance-${userId}-${eventId}`);
  cacheLife("seconds");
  return prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { userId: true, metadata: true },
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
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEventsByCreator(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("minutes");
  return prisma.event.findMany({
    where: { datetime: { gte: new Date() }, createdById: userId },
    orderBy: { datetime: "asc" },
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
      datetime: { gte: new Date() },
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
    where: { datetime: { gte: new Date() }, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "asc" },
    include: { church: { select: { name: true } } },
  });
}

export async function getUserAttendedPastEvents(userId: string) {
  cacheTag("events", `user-events-${userId}`);
  cacheLife("hours");
  return prisma.event.findMany({
    where: { datetime: { lt: new Date() }, isDraft: false, attendees: { some: { userId } } },
    orderBy: { datetime: "desc" },
    include: { church: { select: { name: true } } },
  });
}
