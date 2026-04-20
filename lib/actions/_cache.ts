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
 * Invalidates only the specific event and its parent containers
 * when an event is updated or its state changes (cancel/uncancel).
 * The event stays in the same lists, so broad list tags are not needed.
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
 * Invalidates only the specific series and its parent church
 * when a series is updated (content change, not list membership).
 */
export function invalidateSeriesFields(id: string, churchId?: string | null) {
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) updateTag(`church-${churchId}`);
}

/**
 * Invalidates only the specific series when a user follows/unfollows.
 * Following doesn't change series list membership.
 */
export function invalidateSeriesFollowing(seriesId: string, userId: string) {
  updateTag("series");
  updateTag(`series-${seriesId}`);
  updateTag(`user-series-${userId}`);
}
