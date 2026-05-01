import "server-only";
import { updateTag } from "next/cache";

/**
 * Broadcasts to list caches when an event is created, deleted,
 * published, or unpublished (i.e. its presence in public lists changes).
 */
export function broadcastEventChange(
  id: string,
  churchId?: string | null,
  seriesId?: string | null
) {
  updateTag("events");
  updateTag(`event-${id}`);
  if (churchId) {
    updateTag("churches");
    updateTag(`church-${churchId}`);
  }
  if (seriesId) {
    updateTag("series");
    updateTag(`series-${seriesId}`);
  }
}

/**
 * Invalidates event lists and the specific event when it is updated
 * or its state changes (cancel/uncancel).
 */
export function invalidateEventFields(
  id: string,
  churchId?: string | null,
  seriesId?: string | null
) {
  updateTag("events");
  updateTag(`event-${id}`);
  if (churchId) updateTag(`church-${churchId}`);
  if (seriesId) updateTag(`series-${seriesId}`);
}

/**
 * Broadcasts to list caches when a series is created or deleted.
 */
export function broadcastSeriesChange(id: string, churchId?: string | null) {
  updateTag("events");
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
  result: { oldChurchId: string | null; newChurchId: string | null; affectedSeriesIds: string[] }
) {
  invalidateEventFields(id, result.oldChurchId);
  if (result.newChurchId !== result.oldChurchId) updateTag(`church-${result.newChurchId}`);
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
}
