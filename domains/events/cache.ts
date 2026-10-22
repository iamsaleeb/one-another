import "server-only";
import { updateTag } from "next/cache";

interface EventCacheOptions {
  broadcastToChurchList?: boolean;
}

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

export function invalidateEventUpdate(
  id: string,
  result: {
    oldChurchId: string | null;
    newChurchId: string | null;
    affectedSeriesIds: string[];
    publishedChanged?: boolean;
  }
) {
  // Publishing or unpublishing changes which Events the Church lists show.
  invalidateEventCaches(id, result.oldChurchId, null, {
    broadcastToChurchList: result.publishedChanged,
  });
  if (result.newChurchId && result.newChurchId !== result.oldChurchId)
    updateTag(`church-${result.newChurchId}`);
  if (result.affectedSeriesIds.length > 0) {
    updateTag("series");
    result.affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
}
