import "server-only";
import { updateTag } from "next/cache";

interface EventCacheOptions {
  broadcastToChurchList?: boolean;
}

/**
 * Invalidates all event-related caches. Pass `broadcastToChurchList: true`
 * when the event's presence in public lists changes (create, delete, publish,
 * unpublish) so that the global churches list is also busted.
 */
export function invalidateEventCaches(
  id: string,
  churchId?: string | null,
  seriesId?: string | null,
  options?: EventCacheOptions
) {
  updateTag("events-list");
  updateTag(`event-${id}`);
  updateTag(`event-questions-${id}`);
  if (churchId) {
    if (options?.broadcastToChurchList) updateTag("churches");
    updateTag(`church-${churchId}`);
  }
  if (seriesId) {
    updateTag("series");
    updateTag(`series-${seriesId}`);
  }
}

/**
 * Broadcasts to list caches when a series is created or deleted.
 */
export function broadcastSeriesChange(id: string, churchId?: string | null) {
  updateTag("events-list");
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) {
    updateTag("churches");
    updateTag(`church-${churchId}`);
  }
}

/**
 * Invalidates all caches affected when an event's fields are updated —
 * handles church reassignment and series membership changes.
 */
export function invalidateEventUpdate(
  id: string,
  result: {
    oldChurchId: string | null;
    newChurchId: string | null;
    affectedSeriesIds: string[];
  }
) {
  invalidateEventCaches(id, result.oldChurchId);
  if (result.newChurchId && result.newChurchId !== result.oldChurchId)
    updateTag(`church-${result.newChurchId}`);
  if (result.affectedSeriesIds.length > 0) {
    updateTag("series");
    result.affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
}

/**
 * Invalidates only the specific series and its parent church
 * when a series is updated (content change, not list membership).
 */
export function invalidateSeriesFields(id: string, churchId?: string | null) {
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) updateTag(`church-${churchId}`);
}

/**
 * Invalidates the specific series and the user's followed-series list
 * when a user follows/unfollows. Does not bust broad series lists since
 * follow state is not included in getSeries() list queries.
 */
export function invalidateSeriesFollowing(seriesId: string, userId: string) {
  updateTag(`series-${seriesId}`);
  updateTag(`user-series-${userId}`);
  updateTag(`user-follow-series-${userId}-${seriesId}`);
}
