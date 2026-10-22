// Minimal rows for db tests. Each factory fills only what the schema requires.
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildAbility } from "@/domains/roles/lib/ability";
import type { Grants } from "@/domains/roles/lib/grants";
import { grants } from "@/domains/roles/testing";

export function makeUser(id: string) {
  return prisma.user.create({ data: { id, email: `${id}@test.local` } });
}

export function makeChurch(id: string) {
  return prisma.church.create({
    data: { id, name: `Church ${id}`, description: "" },
  });
}

export function makeSeries(id: string, churchId: string) {
  return prisma.series.create({
    data: {
      id,
      churchId,
      name: `Series ${id}`,
      description: "",
      cadence: "WEEKLY",
      location: "",
      host: "",
      tag: "",
    },
  });
}

export function makeEvent(
  data: Partial<Prisma.EventUncheckedCreateInput> & {
    id: string;
    churchId: string;
  }
) {
  return prisma.event.create({
    data: {
      title: `Event ${data.id}`,
      tag: "Worship",
      description: "",
      metadata: {
        registration: {
          capacity: null,
          collectPhone: false,
          collectNotes: false,
        },
      },
      ...data,
    },
  });
}

export async function attend(eventId: string, userId: string) {
  await prisma.eventAttendee.create({ data: { eventId, userId } });
}

export async function follow(seriesId: string, userId: string) {
  await prisma.seriesFollower.create({ data: { seriesId, userId } });
}

// Write options acting as `userId` with these Grants (a guest when null).
export function as(userId: string | null, userGrants: Partial<Grants> = {}) {
  return {
    ability: buildAbility(userId ? grants(userGrants) : null),
    userId,
  };
}

// Notifications still waiting to go out.
export function pending(
  type: NotificationType,
  where: Prisma.NotificationWhereInput = {}
) {
  return prisma.notification.findMany({
    where: { type, sentAt: null, cancelledAt: null, ...where },
    orderBy: { userId: "asc" },
  });
}
