"use server";

import { auth } from "@/auth";
import type { EventCardItem } from "@/types/pagination";
import {
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
  getFollowedChurchEventsPaged,
  getOtherChurchEventsPaged,
} from "@/lib/actions/data-events";

interface Page {
  items: EventCardItem[];
  nextCursor: string | null;
}

const empty: Page = { items: [], nextCursor: null };

export async function loadMoreEventsAction(
  cursor: string | null
): Promise<Page> {
  return getEventsPaged(cursor);
}

export async function loadMoreMyUpcomingEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getUserAttendedEventsPaged(session.user.id, cursor);
}

export async function loadMoreMyPastEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getUserAttendedPastEventsPaged(session.user.id, cursor);
}

export async function loadMoreMyCreatedEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getEventsByCreatorPaged(session.user.id, cursor);
}

export async function loadMoreCommunityEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getEventsNotByCreatorPaged(session.user.id, cursor);
}

export async function loadMoreFollowedEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  if (!session?.user?.id) return empty;
  return getFollowedChurchEventsPaged(session.user.id, cursor);
}

export async function loadMoreOtherEventsAction(
  cursor: string | null
): Promise<Page> {
  const session = await auth();
  return getOtherChurchEventsPaged(session?.user?.id ?? null, cursor);
}
