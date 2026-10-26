// An Event has happened once it is published and its start time has passed.
// From then on it is read-only: it can no longer be edited, cancelled or
// un-cancelled.
export function hasHappened(
  event: { isDraft: boolean; datetime: Date | null },
  now = new Date()
): boolean {
  return !event.isDraft && !!event.datetime && event.datetime <= now;
}
