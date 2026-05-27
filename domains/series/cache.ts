import "server-only";
import { updateTag } from "next/cache";

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
