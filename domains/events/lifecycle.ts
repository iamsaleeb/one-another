import "server-only";

import { updateTag } from "next/cache";
import { NotificationType, type Prisma } from "@prisma/client";
import { prisma, type Db } from "@/lib/db";
import {
  eventSubject,
  type Action,
  type AppAbility,
} from "@/domains/roles/lib/ability";
import {
  missingOrForbidden,
  resolveWrite,
  scopedTo as scopedToType,
  type WriteOptions,
} from "@/domains/roles/lib/scoped-writes";
import {
  cancelManyNotifications,
  queueNotificationForUsers,
  rescheduleEventReminderNotifications,
  scheduleEventReminderNotifications,
} from "@/domains/notifications/queue";
import { syncEventQuestions } from "./questions/dal";
import { createEventSchema, type CreateEventInput } from "./validations/event";

// The Event lifecycle (see GLOSSARY.md): every change to an Event's state, and
// everything that must follow from it. A change commits together with the
// notifications it queues or withdraws and the Creator Grant it gives; the
// pages it made stale are invalidated once it has committed. Callers say what
// happened and never clean up after it.

export type LifecycleError =
  { error: string } | { fieldErrors: Record<string, string[]> };

type Done = Record<string, never>;

function failed<T extends object>(
  result: T | LifecycleError
): result is LifecycleError {
  return "error" in result || "fieldErrors" in result;
}

// Fan-out to every follower of a large Series stays inside one transaction.
const TRANSACTION = { timeout: 15_000 };

// ---------------------------------------------------------------------------
// Input: one normaliser for create and save

interface Placement {
  churchId: string;
  seriesId: string | null;
}

interface Normalised extends Placement {
  datetime: Date | null;
  fields: Omit<
    Prisma.EventUncheckedCreateInput,
    "churchId" | "seriesId" | "isDraft" | "createdById"
  >;
}

function parseDatetime(input: CreateEventInput): Date | null | "invalid" {
  const raw =
    input.datetimeISO ||
    (input.date && input.time ? `${input.date}T${input.time}` : null);
  if (!raw) return null;
  const datetime = new Date(raw);
  return Number.isNaN(datetime.getTime()) ? "invalid" : datetime;
}

// Turns form input into the stored shape. A draft may be incomplete; a
// published Event must pass the complete schema however it was saved, since
// auto-save sends whatever the form holds.
async function normalise(
  db: Db,
  input: CreateEventInput,
  isDraft: boolean
): Promise<Normalised | LifecycleError> {
  const datetime = parseDatetime(input);
  if (datetime === "invalid")
    return { fieldErrors: { date: ["Invalid date or time"] } };

  // An Event in a Series always lives in that Series' Church.
  const seriesId = input.seriesId || null;
  let churchId = input.churchId;
  if (seriesId) {
    const series = await db.series.findUnique({
      where: { id: seriesId },
      select: { churchId: true },
    });
    churchId = series?.churchId;
  }
  if (!churchId) return { fieldErrors: { churchId: ["Church is required"] } };

  if (!isDraft) {
    const complete = createEventSchema.safeParse(input);
    if (!complete.success)
      return { fieldErrors: complete.error.flatten().fieldErrors };
  }

  const isCamp = input.tag === "Camp";
  if (isCamp && !input.campEndDate && !isDraft)
    return {
      fieldErrors: { campEndDate: ["End date is required for camp events"] },
    };

  const registers = input.requiresRegistration ?? false;
  return {
    churchId,
    seriesId,
    datetime,
    fields: {
      title: input.title || "",
      datetime,
      location: input.location || null,
      host: input.host || null,
      tag: input.tag || "",
      description: input.description || "",
      requiresRegistration: registers,
      metadata: {
        registration: {
          capacity: registers ? (input.capacity ?? null) : null,
          collectPhone: registers ? (input.collectPhone ?? false) : false,
          collectNotes: registers ? (input.collectNotes ?? false) : false,
        },
        ...(isCamp && input.campEndDate
          ? {
              camp: {
                endDate: input.campEndDate,
                allowPartialRegistration:
                  input.campAllowPartialRegistration ?? false,
                agenda: input.campAgenda ?? [],
              },
            }
          : {}),
      },
      price: input.price ?? null,
      photoUrl: input.photoUrl ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Permission-scoped reads

function scopedTo(ability: AppAbility, action: Action, id: string) {
  return scopedToType(ability, action, "Event", id);
}

// Loads an Event the Ability may act on, telling "missing" apart from
// "forbidden" only after the scoped read has failed.
async function findForAction<S extends Prisma.EventSelect>(
  db: Db,
  ability: AppAbility,
  action: Action,
  id: string,
  select: S
): Promise<Prisma.EventGetPayload<{ select: S }> | { error: string }> {
  const event = await db.event.findFirst({
    where: scopedTo(ability, action, id),
    select,
  });
  if (event) return event as Prisma.EventGetPayload<{ select: S }>;
  return missingOrForbidden(await db.event.count({ where: { id } }), "Event");
}

// ---------------------------------------------------------------------------
// Consequences

// Creator Grant: unless a Church Grant already lets the creator edit every
// Event in the Church, give them EVENT_EDITOR on it. A Series Grant is not
// enough: the Event may later leave the Series, or the Grant be revoked.
async function grantCreator(
  db: Db,
  ability: AppAbility,
  userId: string | null,
  eventId: string,
  churchId: string
) {
  if (!userId) return;
  if (ability.can("update", eventSubject({ churchId, seriesId: null }))) return;
  await db.eventStaffAssignment.create({
    data: { userId, eventId, role: "EVENT_EDITOR", assignedBy: userId },
  });
}

const seriesSessionKey = (seriesId: string, eventId: string) =>
  `${seriesId}:${eventId}`;

async function attendeeIds(db: Db, eventId: string): Promise<string[]> {
  const attendees = await db.eventAttendee.findMany({
    where: { eventId },
    select: { userId: true },
  });
  return attendees.map((a) => a.userId);
}

async function notifySeriesFollowers(
  db: Db,
  seriesId: string,
  title: string,
  eventId: string
) {
  const followers = await db.seriesFollower.findMany({
    where: { seriesId },
    select: { userId: true },
  });
  await queueNotificationForUsers(
    followers.map((f) => f.userId),
    {
      type: NotificationType.NEW_SERIES_SESSION,
      title: "New Session Added",
      body: `A new session has been added: ${title}`,
      data: { type: "new_session", seriesId, eventId },
      dedupeKey: seriesSessionKey(seriesId, eventId),
    },
    db
  );
}

async function withdrawSeriesSession(
  db: Db,
  seriesId: string,
  eventId: string
) {
  await cancelManyNotifications(
    {
      type: NotificationType.NEW_SERIES_SESSION,
      dedupeKey: seriesSessionKey(seriesId, eventId),
    },
    db
  );
}

async function withdrawReminders(db: Db, eventId: string) {
  await cancelManyNotifications(
    { type: NotificationType.EVENT_REMINDER, dedupeKey: eventId },
    db
  );
}

async function notifyAttendeesCancelled(
  db: Db,
  eventId: string,
  title: string
) {
  await queueNotificationForUsers(
    await attendeeIds(db, eventId),
    {
      type: NotificationType.EVENT_CANCELLED,
      title: "Event Cancelled",
      body: `${title} has been cancelled`,
      data: { type: "event_cancelled", eventId },
      dedupeKey: `cancelled:${eventId}`,
    },
    db
  );
}

// An Event just became public: attendees who registered while it was a draft
// get their reminders, and its Series' followers hear about the new session.
async function onPublished(
  db: Db,
  event: {
    id: string;
    title: string;
    datetime: Date | null;
    seriesId: string | null;
  }
) {
  await scheduleEventReminderNotifications(
    await attendeeIds(db, event.id),
    event,
    db
  );
  if (event.seriesId)
    await notifySeriesFollowers(db, event.seriesId, event.title, event.id);
}

// An Event went back to draft: nothing still queued may reach its attendees
// or its Series' followers.
async function onUnpublished(db: Db, id: string, seriesId: string | null) {
  await withdrawReminders(db, id);
  if (seriesId) await withdrawSeriesSession(db, seriesId, id);
}

// ---------------------------------------------------------------------------
// Stale pages

interface Stale {
  id: string;
  churchIds: Array<string | null>;
  seriesIds: Array<string | null>;
  // The Event joined or left the public Church lists.
  listsChanged?: boolean;
}

function invalidate({ id, churchIds, seriesIds, listsChanged }: Stale) {
  const unique = (ids: Array<string | null>) =>
    [...new Set(ids)].filter((x): x is string => !!x);
  const churches = unique(churchIds);
  const series = unique(seriesIds);

  updateTag("events-list");
  updateTag(`event-${id}`);
  updateTag(`event-questions-${id}`);
  if (listsChanged && churches.length > 0) updateTag("churches");
  churches.forEach((c) => updateTag(`church-${c}`));
  if (series.length > 0) updateTag("series");
  series.forEach((s) => updateTag(`series-${s}`));
}

// ---------------------------------------------------------------------------
// Transitions

export async function createEvent(
  input: CreateEventInput,
  opts?: WriteOptions
): Promise<LifecycleError | { id: string }> {
  const { ability, userId } = await resolveWrite(opts);
  const isDraft = input.isDraft ?? false;

  const result = await prisma.$transaction(
    async (tx): Promise<LifecycleError | ({ id: string } & Placement)> => {
      const n = await normalise(tx, input, isDraft);
      if (failed(n)) return n;
      const { churchId, seriesId } = n;
      if (!ability.can("create", eventSubject({ churchId, seriesId })))
        return { error: "Unauthorised." };

      const { id } = await tx.event.create({
        data: { ...n.fields, isDraft, churchId, seriesId, createdById: userId },
        select: { id: true },
      });
      if (input.questions && input.questions.length > 0)
        await syncEventQuestions(id, input.questions, userId, tx);
      await grantCreator(tx, ability, userId, id, churchId);
      if (!isDraft)
        await onPublished(tx, {
          id,
          title: n.fields.title,
          datetime: n.datetime,
          seriesId,
        });
      return { id, churchId, seriesId };
    },
    TRANSACTION
  );
  if (failed(result)) return result;

  invalidate({
    id: result.id,
    churchIds: [result.churchId],
    seriesIds: [result.seriesId],
    listsChanged: !isDraft,
  });
  return { id: result.id };
}

// Every save of an Event's form, auto-save included. Publishing and
// unpublishing are changes of `isDraft` within a save (the wizard publishes
// by saving), so they are detected here rather than called separately. An
// omitted isDraft keeps the current state.
export async function saveEvent(
  id: string,
  input: CreateEventInput,
  opts?: WriteOptions
): Promise<LifecycleError | Done> {
  const { ability, userId } = await resolveWrite(opts);

  const result = await prisma.$transaction(
    async (tx): Promise<LifecycleError | Stale> => {
      const existing = await findForAction(tx, ability, "update", id, {
        churchId: true,
        datetime: true,
        isDraft: true,
        seriesId: true,
      });
      if ("error" in existing) return existing;

      const isDraft = input.isDraft ?? existing.isDraft;
      const n = await normalise(tx, input, isDraft);
      if (failed(n)) return n;
      const { churchId, seriesId, datetime } = n;

      // Moving an Event needs authority to place one at the destination, and
      // the user must still be able to edit it once it lands there: otherwise
      // the move would lock them out of their own Event.
      const moved =
        churchId !== existing.churchId || seriesId !== existing.seriesId;
      if (
        moved &&
        !(
          ability.can("create", eventSubject({ churchId, seriesId })) &&
          ability.can("update", eventSubject({ id, churchId, seriesId }))
        )
      )
        return { error: "Unauthorised." };

      const publishing = existing.isDraft && !isDraft;
      const unpublishing = !existing.isDraft && isDraft;
      if (
        (publishing || unpublishing) &&
        !ability.can(
          "publish",
          eventSubject({
            id,
            churchId: existing.churchId,
            seriesId: existing.seriesId,
          })
        )
      )
        return { error: "Unauthorised." };

      await tx.event.update({
        where: scopedTo(ability, "update", id),
        data: { ...n.fields, isDraft, churchId, seriesId },
      });
      if (input.questions !== undefined)
        await syncEventQuestions(id, input.questions, userId, tx);

      const rescheduled =
        datetime &&
        existing.datetime &&
        datetime.getTime() !== existing.datetime.getTime();
      if (!existing.isDraft && !unpublishing && rescheduled)
        await rescheduleEventReminderNotifications(id, datetime, tx);

      // An Event leaving a Series must not leave behind a pending "new
      // session" notification for that Series' followers.
      if (existing.seriesId && existing.seriesId !== seriesId)
        await withdrawSeriesSession(tx, existing.seriesId, id);

      if (publishing)
        await onPublished(tx, {
          id,
          title: n.fields.title,
          datetime,
          seriesId,
        });
      if (unpublishing) await onUnpublished(tx, id, existing.seriesId);

      return {
        id,
        churchIds: [existing.churchId, churchId],
        seriesIds: [existing.seriesId, seriesId],
        listsChanged: publishing || unpublishing,
      };
    },
    TRANSACTION
  );
  if (failed(result)) return result;

  invalidate(result);
  return {};
}

export async function cancelEvent(
  id: string,
  reason: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { ability } = await resolveWrite(opts);

  const result = await prisma.$transaction(
    async (tx): Promise<{ error: string } | Stale> => {
      const event = await findForAction(tx, ability, "update", id, {
        churchId: true,
        title: true,
        seriesId: true,
      });
      if ("error" in event) return event;

      await tx.event.update({
        where: scopedTo(ability, "update", id),
        data: { cancelledAt: new Date(), cancellationReason: reason },
      });
      await withdrawReminders(tx, id);
      await notifyAttendeesCancelled(tx, id, event.title);

      return { id, churchIds: [event.churchId], seriesIds: [event.seriesId] };
    },
    TRANSACTION
  );
  if ("error" in result) return result;

  invalidate(result);
  return {};
}

export async function uncancelEvent(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { ability } = await resolveWrite(opts);

  const result = await prisma.$transaction(
    async (tx): Promise<{ error: string } | Stale> => {
      const event = await findForAction(tx, ability, "update", id, {
        churchId: true,
        seriesId: true,
      });
      if ("error" in event) return event;

      await tx.event.update({
        where: scopedTo(ability, "update", id),
        data: { cancelledAt: null, cancellationReason: null },
      });

      return { id, churchIds: [event.churchId], seriesIds: [event.seriesId] };
    },
    TRANSACTION
  );
  if ("error" in result) return result;

  invalidate(result);
  return {};
}

export async function deleteEvent(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { ability } = await resolveWrite(opts);

  const result = await prisma.$transaction(
    async (tx): Promise<{ error: string } | Stale> => {
      const event = await findForAction(tx, ability, "delete", id, {
        churchId: true,
        seriesId: true,
      });
      if ("error" in event) return event;

      await withdrawReminders(tx, id);
      if (event.seriesId) await withdrawSeriesSession(tx, event.seriesId, id);
      await tx.event.delete({ where: scopedTo(ability, "delete", id) });

      return {
        id,
        churchIds: [event.churchId],
        seriesIds: [event.seriesId],
        listsChanged: true,
      };
    },
    TRANSACTION
  );
  if ("error" in result) return result;

  invalidate(result);
  return {};
}
