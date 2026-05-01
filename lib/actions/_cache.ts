import "server-only";
import { updateTag } from "next/cache";

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

export function broadcastSeriesChange(id: string, churchId?: string | null) {
  updateTag("events");
  updateTag("series");
  updateTag(`series-${id}`);
  if (churchId) {
    updateTag("churches");
    updateTag(`church-${churchId}`);
  }
}

export function invalidateEventUpdate(
  id: string,
  oldChurchId: string | null | undefined,
  newChurchId: string | null | undefined,
  affectedSeriesIds: string[]
) {
  invalidateEventFields(id, oldChurchId);
  if (newChurchId && newChurchId !== oldChurchId) updateTag(`church-${newChurchId}`);
  if (affectedSeriesIds.length > 0) {
    updateTag("series");
    affectedSeriesIds.forEach((sid) => updateTag(`series-${sid}`));
  }
}

export function invalidateSeriesFields(id: string, oldChurchId?: string | null, newChurchId?: string | null) {
  updateTag("series");
  updateTag(`series-${id}`);
  if (oldChurchId) updateTag(`church-${oldChurchId}`);
  if (newChurchId && newChurchId !== oldChurchId) updateTag(`church-${newChurchId}`);
}

// follow state not in getSeries() queries — don't bust broad series lists
export function invalidateSeriesFollowing(seriesId: string, userId: string) {
  updateTag(`series-${seriesId}`);
  updateTag(`user-series-${userId}`);
}
