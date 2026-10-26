import type { Prisma } from "@prisma/client";

// Public visibility is a fact about the Event, the same for every viewer, so
// it stays outside the Ability and public reads can share one cache entry.
// Who may see a draft is an Ability question: `can("update", event)`.

export const publishedEvent = {
  isDraft: false,
} satisfies Prisma.EventWhereInput;

// What public lists show: published Events that have not ended yet, so a Live
// Event stays listed until it is over.
export function upcomingPublicEvents() {
  return {
    endDatetime: { gt: new Date() },
    ...publishedEvent,
  } satisfies Prisma.EventWhereInput;
}

export function isPubliclyVisible(event: { isDraft: boolean }): boolean {
  return !event.isDraft;
}
