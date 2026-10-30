import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import {
  NotificationType,
  type AccessRequestStatus,
  type ChurchRole,
  type EventRole,
  type Prisma,
  type ResourceType,
  type SeriesRole,
} from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import {
  cancelManyNotifications,
  queueNotification,
  queueNotificationForUsers,
} from "@/domains/notifications/queue";
import { RESOURCE_PATHS } from "@/domains/access-requests/lib/constants";
import { accessRequestTags } from "@/domains/access-requests/lib/tags";
import {
  buildAbility,
  churchSubject,
  eventSubject,
  seriesSubject,
  type Action,
  type AppAbility,
} from "./lib/ability";
import { loadGrants } from "./lib/grants";
import { resolveWrite, type WriteOptions } from "./lib/scoped-writes";

// Grants and Access requests (see GLOSSARY.md). Every Grant the app gives or
// takes away goes through here, so the rules hold everywhere: granting never
// lowers a role, revoking a Helper takes back only the Grant their request
// gave, and an Access request and the Grant it gave change together. Each
// change commits in one transaction; the pages it made stale are invalidated
// once it has committed.

export interface AccessResource {
  type: ResourceType;
  id: string;
}

export type Role = ChurchRole | SeriesRole | EventRole;

type Done = Record<string, never>;
interface Failure {
  error: string;
}

// Each resource's roles, lowest first.
const RANKS: Record<ResourceType, readonly Role[]> = {
  CHURCH: ["EVENT_CREATOR", "EVENT_MANAGER", "CHURCH_ADMIN"],
  SERIES: ["SERIES_SESSION_CREATOR", "SERIES_MANAGER"],
  EVENT: ["EVENT_EDITOR", "EVENT_MANAGER"],
};

const rank = (type: ResourceType, role: string) =>
  RANKS[type].indexOf(role as Role);

// The role an Access request asks for.
const REQUESTED_ROLE = {
  EVENT: "EVENT_EDITOR",
  SERIES: "SERIES_SESSION_CREATOR",
  CHURCH: "EVENT_CREATOR",
} as const satisfies Record<ResourceType, Role>;

// The Capability that lets someone manage a resource's Helpers.
export const MANAGE_HELPERS = {
  EVENT: "manage_staff",
  SERIES: "manage_staff",
  CHURCH: "manage_members",
} as const satisfies Record<ResourceType, Action>;

// What the requested role is for. A user who can already do it, through any
// Grant, has nothing to ask for.
const HELPER_CAPABILITY: Record<ResourceType, Action> = {
  EVENT: "update",
  SERIES: "create_event",
  CHURCH: "create_event",
};

// ---------------------------------------------------------------------------
// Resources and their Grant rows

async function subjectOf(db: Db, r: AccessResource) {
  switch (r.type) {
    case "EVENT": {
      const event = await db.event.findUnique({
        where: { id: r.id },
        select: { id: true, churchId: true, seriesId: true },
      });
      return event && eventSubject(event);
    }
    case "SERIES": {
      const series = await db.series.findUnique({
        where: { id: r.id },
        select: { id: true, churchId: true },
      });
      return series && seriesSubject(series);
    }
    case "CHURCH": {
      const church = await db.church.findUnique({
        where: { id: r.id },
        select: { id: true },
      });
      return church && churchSubject(church);
    }
  }
}

type Subject = NonNullable<Awaited<ReturnType<typeof subjectOf>>>;

// The resource, if `ability` may manage its Helpers.
async function managed(
  db: Db,
  ability: AppAbility,
  r: AccessResource
): Promise<Failure | { subject: Subject }> {
  const subject = await subjectOf(db, r);
  if (!subject) return { error: "Resource not found." };
  if (!ability.can(MANAGE_HELPERS[r.type], subject))
    return { error: "Unauthorised." };
  return { subject };
}

async function roleOn(
  db: Db,
  r: AccessResource,
  userId: string
): Promise<Role | null> {
  const select = { role: true } as const;
  switch (r.type) {
    case "EVENT":
      return (
        (
          await db.eventStaffAssignment.findUnique({
            where: { userId_eventId: { userId, eventId: r.id } },
            select,
          })
        )?.role ?? null
      );
    case "SERIES":
      return (
        (
          await db.seriesStaffAssignment.findUnique({
            where: { userId_seriesId: { userId, seriesId: r.id } },
            select,
          })
        )?.role ?? null
      );
    case "CHURCH":
      return (
        (
          await db.churchMembership.findUnique({
            where: { userId_churchId: { userId, churchId: r.id } },
            select,
          })
        )?.role ?? null
      );
  }
}

async function setRole(
  db: Db,
  r: AccessResource,
  userId: string,
  role: Role,
  assignedBy: string | null
) {
  switch (r.type) {
    case "EVENT": {
      const data = { role: role as EventRole, assignedBy };
      await db.eventStaffAssignment.upsert({
        where: { userId_eventId: { userId, eventId: r.id } },
        update: data,
        create: { userId, eventId: r.id, ...data },
      });
      return;
    }
    case "SERIES": {
      const data = { role: role as SeriesRole, assignedBy };
      await db.seriesStaffAssignment.upsert({
        where: { userId_seriesId: { userId, seriesId: r.id } },
        update: data,
        create: { userId, seriesId: r.id, ...data },
      });
      return;
    }
    case "CHURCH": {
      const data = { role: role as ChurchRole, assignedBy };
      await db.churchMembership.upsert({
        where: { userId_churchId: { userId, churchId: r.id } },
        update: data,
        create: { userId, churchId: r.id, ...data },
      });
      return;
    }
  }
}

// Deletes the user's Grant on the resource; with `only`, just while it is
// still that role.
async function deleteRole(
  db: Db,
  r: AccessResource,
  userId: string,
  only?: Role
) {
  switch (r.type) {
    case "EVENT":
      await db.eventStaffAssignment.deleteMany({
        where: { userId, eventId: r.id, role: only as EventRole | undefined },
      });
      return;
    case "SERIES":
      await db.seriesStaffAssignment.deleteMany({
        where: {
          userId,
          seriesId: r.id,
          role: only as SeriesRole | undefined,
        },
      });
      return;
    case "CHURCH":
      await db.churchMembership.deleteMany({
        where: {
          userId,
          churchId: r.id,
          role: only as ChurchRole | undefined,
        },
      });
      return;
  }
}

// Gives the user at least `role` on the resource, never lowering a higher
// one they already hold. True when anything changed.
async function raiseTo(
  db: Db,
  r: AccessResource,
  userId: string,
  role: Role,
  assignedBy: string | null
): Promise<boolean> {
  const current = await roleOn(db, r, userId);
  if (current && rank(r.type, current) >= rank(r.type, role)) return false;
  await setRole(db, r, userId, role, assignedBy);
  return true;
}

// ---------------------------------------------------------------------------
// Access request rows

// The foreign key column an Access request on this resource sets.
export function requestResource(r: AccessResource) {
  switch (r.type) {
    case "EVENT":
      return { eventId: r.id };
    case "SERIES":
      return { seriesId: r.id };
    case "CHURCH":
      return { churchId: r.id };
  }
}

function requestKey(
  r: AccessResource,
  requesterId: string
): Prisma.AccessRequestWhereUniqueInput {
  switch (r.type) {
    case "EVENT":
      return { requesterId_eventId: { requesterId, eventId: r.id } };
    case "SERIES":
      return { requesterId_seriesId: { requesterId, seriesId: r.id } };
    case "CHURCH":
      return { requesterId_churchId: { requesterId, churchId: r.id } };
  }
}

interface RequestRow {
  resourceType: ResourceType;
  eventId: string | null;
  seriesId: string | null;
  churchId: string | null;
}

// The resource an Access request is on. The CHECK constraint guarantees
// exactly one id is set.
function resourceOf(request: RequestRow): AccessResource {
  const id = request.eventId ?? request.seriesId ?? request.churchId;
  if (!id) throw new Error("Access request has no resource");
  return { type: request.resourceType, id };
}

const REQUEST = {
  id: true,
  requesterId: true,
  requestedRole: true,
  status: true,
  resourceType: true,
  eventId: true,
  seriesId: true,
  churchId: true,
  gaveGrant: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// Notifications
//
// Whoever may review a request hears that it was made, and the requester
// hears how it was decided. Each is queued in the change's transaction.

// One asking: a request asked again after a decision is news again.
const askingKey = (request: { id: string; updatedAt: Date }) =>
  `${request.id}:${request.updatedAt.getTime()}`;

async function nameOf(db: Db, r: AccessResource): Promise<string> {
  switch (r.type) {
    case "EVENT":
      return (
        (
          await db.event.findUnique({
            where: { id: r.id },
            select: { title: true },
          })
        )?.title ?? "an event"
      );
    case "SERIES":
      return (
        (
          await db.series.findUnique({
            where: { id: r.id },
            select: { name: true },
          })
        )?.name ?? "a series"
      );
    case "CHURCH":
      return (
        (
          await db.church.findUnique({
            where: { id: r.id },
            select: { name: true },
          })
        )?.name ?? "a church"
      );
  }
}

// Everyone who may manage the resource's Helpers, other than the requester:
// candidates hold a Grant on it or on the Series or Church above it, and the
// Ability decides. Platform admins hear only when nobody else can review.
async function reviewerIds(
  db: Db,
  r: AccessResource,
  subject: Subject,
  requesterId: string
): Promise<string[]> {
  const home = subject as { id: string; churchId?: string; seriesId?: string };
  const churchId = r.type === "CHURCH" ? r.id : home.churchId;
  const seriesId = r.type === "SERIES" ? r.id : home.seriesId;
  const eventId = r.type === "EVENT" ? r.id : undefined;

  const candidates = await db.user.findMany({
    where: {
      id: { not: requesterId },
      OR: [
        { churchMemberships: { some: { churchId } } },
        ...(seriesId ? [{ seriesStaff: { some: { seriesId } } }] : []),
        ...(eventId ? [{ eventStaff: { some: { eventId } } }] : []),
      ],
    },
    select: { id: true },
  });
  const reviewers: string[] = [];
  for (const { id } of candidates) {
    if (buildAbility(await loadGrants(id)).can(MANAGE_HELPERS[r.type], subject))
      reviewers.push(id);
  }
  if (reviewers.length > 0) return reviewers;

  const admins = await db.platformRoleAssignment.findMany({
    where: { role: "PLATFORM_ADMIN", userId: { not: requesterId } },
    select: { userId: true },
  });
  return admins.map((a) => a.userId);
}

async function notifyReviewers(
  db: Db,
  r: AccessResource,
  subject: Subject,
  request: { id: string; updatedAt: Date; requesterId: string }
) {
  const [requester, name] = await Promise.all([
    db.user.findUnique({
      where: { id: request.requesterId },
      select: { name: true },
    }),
    nameOf(db, r),
  ]);
  await queueNotificationForUsers(
    await reviewerIds(db, r, subject, request.requesterId),
    {
      type: NotificationType.ROLE_REQUEST_RECEIVED,
      title: "New helper request",
      body: `${requester?.name ?? "Someone"} asked to help with ${name}.`,
      data: {
        type: "access_request",
        url: `/${RESOURCE_PATHS[r.type]}/${r.id}/helpers/${request.id}`,
      },
      dedupeKey: askingKey(request),
    },
    db
  );
}

// The request is no longer waiting: reviewers who have not heard yet won't.
async function withdrawFromReviewers(
  db: Db,
  request: { id: string; updatedAt: Date }
) {
  await cancelManyNotifications(
    {
      type: NotificationType.ROLE_REQUEST_RECEIVED,
      dedupeKey: askingKey(request),
    },
    db
  );
}

async function notifyOutcome(
  db: Db,
  r: AccessResource,
  request: { id: string; updatedAt: Date; requesterId: string },
  decision: "APPROVED" | "DENIED"
) {
  const name = await nameOf(db, r);
  await queueNotification(
    {
      userId: request.requesterId,
      type: NotificationType.ROLE_REQUEST_OUTCOME,
      ...(decision === "APPROVED"
        ? {
            title: "Request approved",
            body: `You can now help with ${name}.`,
          }
        : {
            title: "Request declined",
            body: `Your request to help with ${name} was declined.`,
          }),
      data: {
        type: "access_request",
        url: `/${RESOURCE_PATHS[r.type]}/${r.id}`,
      },
      dedupeKey: askingKey(request),
    },
    db
  );
}

// ---------------------------------------------------------------------------
// Stale pages

interface Stale {
  resource: AccessResource;
  userId: string;
  requestId?: string;
}

function invalidate({ resource, userId, requestId }: Stale) {
  const { type, id } = resource;
  updateTag(accessRequestTags.mine(type, id, userId));
  updateTag(accessRequestTags.pending(type, id));
  updateTag(accessRequestTags.resolved(type, id));
  if (requestId) updateTag(accessRequestTags.request(requestId));
  // Church pages list who organises them.
  if (type === "CHURCH") updateTag("churches");
  revalidatePath(`/${RESOURCE_PATHS[type]}/${id}/helpers`);
}

// Runs a change in one transaction and invalidates what it made stale once
// it has committed.
async function change(
  run: (tx: Db) => Promise<Failure | Stale>
): Promise<Failure | Done> {
  const result = await prisma.$transaction(run);
  if ("error" in result) return result;
  invalidate(result);
  return {};
}

// ---------------------------------------------------------------------------
// Access requests

export async function requestAccess(
  resource: AccessResource,
  message: string | undefined,
  opts?: WriteOptions
): Promise<Failure | Done> {
  const { ability, userId } = await resolveWrite(opts);
  if (!userId) return { error: "You must be signed in." };

  return change(async (tx) => {
    const subject = await subjectOf(tx, resource);
    if (!subject) return { error: "Resource not found." };
    if (ability.can(HELPER_CAPABILITY[resource.type], subject))
      return { error: "You already have access to this resource." };

    const key = requestKey(resource, userId);
    const existing = await tx.accessRequest.findUnique({
      where: key,
      select: { status: true },
    });
    if (existing?.status === "PENDING")
      return { error: "You already have a pending request." };

    const requestedRole = REQUESTED_ROLE[resource.type];
    const request = await tx.accessRequest.upsert({
      where: key,
      create: {
        requesterId: userId,
        resourceType: resource.type,
        ...requestResource(resource),
        requestedRole,
        message,
      },
      update: {
        status: "PENDING",
        message,
        requestedRole,
        reviewedBy: null,
        reviewedAt: null,
        gaveGrant: false,
      },
      select: { id: true, updatedAt: true, requesterId: true },
    });
    await notifyReviewers(tx, resource, subject, request);
    return { resource, userId };
  });
}

export async function cancelAccessRequest(
  requestId: string,
  opts?: WriteOptions
): Promise<Failure | Done> {
  const { userId } = await resolveWrite(opts);
  if (!userId) return { error: "You must be signed in." };

  return change(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id: requestId },
      select: REQUEST,
    });
    if (!request) return { error: "Request not found." };
    if (request.requesterId !== userId) return { error: "Unauthorised." };

    const { count } = await tx.accessRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: "CANCELLED", reviewedAt: new Date() },
    });
    if (count === 0) return { error: "Request is not pending." };
    await withdrawFromReviewers(tx, request);

    return { resource: resourceOf(request), userId, requestId };
  });
}

export async function reviewAccessRequest(
  requestId: string,
  decision: Extract<AccessRequestStatus, "APPROVED" | "DENIED">,
  opts?: WriteOptions
): Promise<Failure | Done> {
  const { ability, userId } = await resolveWrite(opts);
  if (!userId) return { error: "Unauthorised." };

  return change(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id: requestId },
      select: REQUEST,
    });
    if (!request) return { error: "Request not found." };
    if (request.status !== "PENDING")
      return { error: "Request is no longer pending." };
    if (request.requesterId === userId) return { error: "Unauthorised." };

    const resource = resourceOf(request);
    const gate = await managed(tx, ability, resource);
    if ("error" in gate) return gate;

    // Claimed under the row lock: of two concurrent reviews, one wins.
    const { count } = await tx.accessRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: decision, reviewedBy: userId, reviewedAt: new Date() },
    });
    if (count === 0) return { error: "Request was already processed." };
    await withdrawFromReviewers(tx, request);
    await notifyOutcome(tx, resource, request, decision);

    if (decision === "APPROVED") {
      // Nothing to give when the requester can already do what the role is
      // for, through a higher role here or a Grant that cascades from above.
      // The request remembers whether it gave the Grant, so revoking it
      // never takes a role it did not give.
      const requester = buildAbility(await loadGrants(request.requesterId));
      if (
        !requester.can(HELPER_CAPABILITY[resource.type], gate.subject) &&
        (await raiseTo(
          tx,
          resource,
          request.requesterId,
          request.requestedRole as Role,
          userId
        ))
      )
        await tx.accessRequest.update({
          where: { id: requestId },
          data: { gaveGrant: true },
        });
    }

    return { resource, userId: request.requesterId, requestId };
  });
}

// Takes back the Grant an approved Access request gave. A role it did not
// give (held already, or a promotion since) is not the request's to take, so
// it stays.
export async function revokeHelper(
  requestId: string,
  opts?: WriteOptions
): Promise<Failure | Done> {
  const { ability, userId } = await resolveWrite(opts);
  if (!userId) return { error: "Unauthorised." };

  return change(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id: requestId },
      select: REQUEST,
    });
    if (!request) return { error: "Request not found." };
    if (request.status !== "APPROVED")
      return { error: "Access is not currently approved." };

    const resource = resourceOf(request);
    const gate = await managed(tx, ability, resource);
    if ("error" in gate) return gate;

    const { count } = await tx.accessRequest.updateMany({
      where: { id: requestId, status: "APPROVED" },
      data: { status: "REVOKED", reviewedBy: userId, reviewedAt: new Date() },
    });
    if (count === 0) return { error: "Access is not currently approved." };

    if (request.gaveGrant)
      await deleteRole(
        tx,
        resource,
        request.requesterId,
        request.requestedRole as Role
      );
    return { resource, userId: request.requesterId, requestId };
  });
}

// ---------------------------------------------------------------------------
// Grants given directly

// Gives `userId` at least `role` on the resource. `granted` is false when
// they already held it or a higher role there.
export async function grant(
  resource: AccessResource,
  userId: string,
  role: Role,
  opts?: WriteOptions
): Promise<Failure | { granted: boolean }> {
  const { ability, userId: actorId } = await resolveWrite(opts);
  if (rank(resource.type, role) < 0) return { error: "Invalid role." };

  const result = await prisma.$transaction(
    async (tx): Promise<Failure | { granted: boolean }> => {
      const gate = await managed(tx, ability, resource);
      if ("error" in gate) return gate;
      return { granted: await raiseTo(tx, resource, userId, role, actorId) };
    }
  );
  if ("error" in result) return result;

  if (result.granted) invalidate({ resource, userId });
  return result;
}

// Takes away the user's Grant on the resource. An approved Access request
// that gave it is revoked with it. A Church admin is not removed this way.
export async function removeGrant(
  resource: AccessResource,
  userId: string,
  opts?: WriteOptions
): Promise<Failure | Done> {
  const { ability, userId: actorId } = await resolveWrite(opts);

  return change(async (tx) => {
    const gate = await managed(tx, ability, resource);
    if ("error" in gate) return gate;

    const current = await roleOn(tx, resource, userId);
    if (current === "CHURCH_ADMIN")
      return { error: "Cannot remove a church admin." };
    await deleteRole(tx, resource, userId);

    const approved = await tx.accessRequest.findFirst({
      where: { requesterId: userId, ...requestResource(resource) },
      select: { id: true, status: true },
    });
    if (approved?.status !== "APPROVED") return { resource, userId };

    await tx.accessRequest.update({
      where: { id: approved.id },
      data: { status: "REVOKED", reviewedBy: actorId, reviewedAt: new Date() },
    });
    return { resource, userId, requestId: approved.id };
  });
}

// The Creator Grant, given inside the Event lifecycle's transaction: unless a
// Church Grant already lets the creator edit every Event in the Church, they
// get EVENT_EDITOR on it. A Series Grant is not enough: the Event may later
// leave the Series, or the Grant be revoked.
export async function grantCreator(
  tx: Db,
  ability: AppAbility,
  userId: string | null,
  eventId: string,
  churchId: string
) {
  if (!userId) return;
  if (ability.can("update", eventSubject({ churchId, seriesId: null }))) return;
  await raiseTo(
    tx,
    { type: "EVENT", id: eventId },
    userId,
    "EVENT_EDITOR",
    userId
  );
}
