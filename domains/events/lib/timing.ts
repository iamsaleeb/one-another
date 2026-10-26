// Where an Event is in time. A published Event always has a start and an end;
// a draft may have neither yet.

interface Timed {
  isDraft: boolean;
  datetime: Date | null;
}

// An Event has happened once it is published and its start time has passed.
// From then on it is read-only: it can no longer be edited, cancelled or
// un-cancelled.
export function hasHappened(event: Timed, now = new Date()): boolean {
  return !event.isDraft && !!event.datetime && event.datetime <= now;
}

// An Event is Live from its start until its end, unless it was cancelled.
export function isLive(
  event: Timed & { endDatetime: Date | null; cancelledAt?: Date | null },
  now = new Date()
): boolean {
  return (
    hasHappened(event, now) &&
    !event.cancelledAt &&
    !!event.endDatetime &&
    now < event.endDatetime
  );
}
