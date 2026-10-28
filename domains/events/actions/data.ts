"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";
import {
  upcomingPublicEvents,
  publishedEvent,
} from "@/domains/events/lib/visibility";
import type { EventCardItem } from "@/lib/types/pagination";

const PAGE_SIZE = 10;

export async function getEventById(id: string) {
  cacheTag(`event-${id}`);
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
  cacheTag(`event-${eventId}`);
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

// A personal list goes stale whenever one of its Events changes, and every
// Event lifecycle change invalidates `event-${id}`.
function tagEachEvent(items: Array<{ id: string }>) {
  if (items.length > 0) cacheTag(...items.map((e) => `event-${e.id}`));
}

export async function getUserAttendedEventsPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag(`user-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      ...upcomingPublicEvents(),
      attendees: { some: { userId } },
    },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { church: { select: { name: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  tagEachEvent(items);
  return {
    items,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getEventsNotByCreatorPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag("events-list");
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      ...upcomingPublicEvents(),
      OR: [{ createdById: { not: userId } }, { createdById: null }],
    },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getFollowedChurchEventsPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag("events-list", `user-follows-${userId}`, `saved-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: {
      church: { followers: { some: { userId } } },
      ...upcomingPublicEvents(),
    },
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      church: { select: { name: true } },
      savedBy: { where: { userId }, select: { id: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return {
    items: page.map(({ savedBy, ...row }) => ({
      ...row,
      isSaved: savedBy.length > 0,
    })),
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getOtherChurchEventsPaged(
  userId: string | null,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  if (userId !== null) {
    cacheTag("events-list", `user-follows-${userId}`, `saved-events-${userId}`);
    cacheLife("minutes");
    const rows = await prisma.event.findMany({
      where: {
        church: { followers: { none: { userId } } },
        ...upcomingPublicEvents(),
      },
      orderBy: { datetime: "asc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        church: { select: { name: true } },
        savedBy: { where: { userId }, select: { id: true } },
      },
    });
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    return {
      items: page.map(({ savedBy, ...row }) => ({
        ...row,
        isSaved: savedBy.length > 0,
      })),
      nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
    };
  }

  cacheTag("events-list");
  cacheLife("minutes");
  const rows = await prisma.event.findMany({
    where: upcomingPublicEvents(),
    orderBy: { datetime: "asc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { church: { select: { name: true } } },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getMySavedEventsPaged(
  userId: string,
  cursor: string | null
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  cacheTag(`saved-events-${userId}`);
  cacheLife("minutes");
  const rows = await prisma.savedEvent.findMany({
    where: { userId, event: publishedEvent },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      event: {
        include: { church: { select: { name: true } } },
      },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = (hasMore ? rows.slice(0, PAGE_SIZE) : rows).map((r) => ({
    id: r.event.id,
    datetime: r.event.datetime,
    endDatetime: r.event.endDatetime,
    title: r.event.title,
    tag: r.event.tag,
    host: r.event.host,
    cancelledAt: r.event.cancelledAt,
    isDraft: r.event.isDraft,
    photoUrl: r.event.photoUrl,
    church: r.event.church,
    isSaved: true,
  }));
  tagEachEvent(items);
  return {
    items,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}

export async function getIsEventSaved(
  eventId: string,
  userId: string
): Promise<boolean> {
  cacheTag(`saved-events-${userId}`);
  cacheLife("seconds");
  const record = await prisma.savedEvent.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true },
  });
  return record !== null;
}
