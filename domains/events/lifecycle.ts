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
import { grantCreator } from "@/domains/roles/access";
import {
  cancelManyNotifications,
  queueNotificationForUsers,
  syncEventReminders,
} from "@/domains/notifications/queue";
import { isPubliclyVisible } from "./lib/visibility";
import { syncEventQuestions } from "./questions/dal";
import { checkAnswers, saveAnswers } from "./questions/responses";
import type { ResponseInput } from "./questions/validations";
import {
  createEventSchema,
  parseEventMetadata,
  type CreateEventInput,
  type EventMetadata,
} from "./validations/event";

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

const seriesSessionKey = (seriesId: string, eventId: string) =>
  `${seriesId}:${eventId}`;

async function attendeeIds(
  db: Db,
  eventId: string,
  userId?: string
): Promise<string[]> {
  const attendees = await db.eventAttendee.findMany({
    where: { eventId, ...(userId ? { userId } : {}) },
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

// Reminders follow one rule rather than a fix per transition: after any change
// the Event's reminders are made to match it (see syncEventReminders). A
// deleted Event has none. With `only`, just that user's reminder is synced:
// one attendee joining or leaving costs one row, not one per attendee.
async function syncReminders(
  db: Db,
  eventId: string,
  only?: { userId: string }
) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { title: true, datetime: true, isDraft: true, cancelledAt: true },
  });
  const attendees = event ? await attendeeIds(db, eventId, only?.userId) : [];
  await syncEventReminders(
    {
      id: eventId,
      title: event?.title ?? "",
      datetime: event?.datetime ?? null,
      live: !!event && !event.isDraft && !event.cancelledAt,
    },
    attendees,
    db,
    only
  );
}

const cancelledKey = (eventId: string) => `cancelled:${eventId}`;

// A deleted Event has no page to link to, so its notice carries no eventId.
async function notifyAttendeesCancelled(
  db: Db,
  eventId: string,
  title: string,
  { link }: { link: boolean }
) {
  await queueNotificationForUsers(
    await attendeeIds(db, eventId),
    {
      type: NotificationType.EVENT_CANCELLED,
      title: "Event Cancelled",
      body: `${title} has been cancelled`,
      data: link
        ? { type: "event_cancelled", eventId }
        : { type: "event_cancelled" },
      dedupeKey: cancelledKey(eventId),
    },
    db
  );
}

async function withdrawCancelledNotice(db: Db, eventId: string) {
  await cancelManyNotifications(
    {
      type: NotificationType.EVENT_CANCELLED,
      dedupeKey: cancelledKey(eventId),
    },
    db
  );
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

function invalidate(...events: Stale[]) {
  const tags = new Set<string>();
  for (const { id, churchIds, seriesIds, listsChanged } of events) {
    const churches = churchIds.filter((c): c is string => !!c);
    const series = seriesIds.filter((s): s is string => !!s);

    tags.add("events-list");
    tags.add(`event-${id}`);
    tags.add(`event-questions-${id}`);
    if (listsChanged && churches.length > 0) tags.add("churches");
    churches.forEach((c) => tags.add(`church-${c}`));
    if (series.length > 0) tags.add("series");
    series.forEach((s) => tags.add(`series-${s}`));
  }
  tags.forEach((tag) => updateTag(tag));
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
      // A new Event has no attendees yet, so no reminders to sync.
      if (!isDraft && seriesId)
        await notifySeriesFollowers(tx, seriesId, n.fields.title, id);
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
        isDraft: true,
        seriesId: true,
      });
      if ("error" in existing) return existing;

      const isDraft = input.isDraft ?? existing.isDraft;
      const n = await normalise(tx, input, isDraft);
      if (failed(n)) return n;
      const { churchId, seriesId } = n;

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

      await syncReminders(tx, id);

      // An Event leaving its Series, or going back to draft, must not leave
      // behind a pending "new session" notice for that Series' followers.
      if (existing.seriesId && (existing.seriesId !== seriesId || unpublishing))
        await withdrawSeriesSession(tx, existing.seriesId, id);
      // A session that just became public is news to its Series' followers.
      if (publishing && seriesId)
        await notifySeriesFollowers(tx, seriesId, n.fields.title, id);

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
      await syncReminders(tx, id);
      // Uncancelling does not send it again: "new session" would be stale.
      if (event.seriesId) await withdrawSeriesSession(tx, event.seriesId, id);
      await notifyAttendeesCancelled(tx, id, event.title, { link: true });

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
      await syncReminders(tx, id);
      await withdrawCancelledNotice(tx, id);

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
        title: true,
        isDraft: true,
        cancelledAt: true,
        datetime: true,
      });
      if ("error" in event) return event;

      // Attendees of an Event still to come would otherwise just turn up.
      const upcoming =
        !event.isDraft &&
        !event.cancelledAt &&
        !!event.datetime &&
        event.datetime > new Date();
      if (upcoming)
        await notifyAttendeesCancelled(tx, id, event.title, { link: false });
      if (event.seriesId) await withdrawSeriesSession(tx, event.seriesId, id);
      await tx.event.delete({ where: scopedTo(ability, "delete", id) });
      await syncReminders(tx, id);

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

// ---------------------------------------------------------------------------
// Attendance
//
// An Attendee joining or leaving is an Event change too: their reminder and
// the Event's pages follow it. Each runs under a lock on the Event row, so it
// sees the Event as a concurrent cancel or save leaves it, and capacity is
// counted with no other join in flight. Attending a published Event needs no
// Grant, only a signed-in user.

export interface Registration {
  phone?: string;
  notes?: string;
  selectedDays?: string[];
  responses?: ResponseInput[];
}

const SIGNED_OUT = "You must be signed in.";
const CANCELLED = "This event has been cancelled.";
const FULLY_BOOKED = "Sorry, this event is fully booked.";

async function lockEvent(tx: Db, id: string) {
  await tx.$queryRaw`SELECT 1 FROM events WHERE id = ${id} FOR UPDATE`;
}

// A camp open to partial registration keeps only the chosen days inside it.
function campDays(
  datetime: Date | null,
  camp: EventMetadata["camp"],
  selected: string[] = []
): { error: string } | { days?: string[] } {
  if (!camp?.allowPartialRegistration || !camp.endDate) return {};
  if (!datetime) {
    return {
      error:
        "This camp event is missing a start date, so partial registration is unavailable.",
    };
  }
  const start = datetime.toISOString().slice(0, 10);
  const days = selected.filter((d) => d >= start && d <= camp.endDate);
  if (days.length === 0) {
    return { error: "Please select at least one valid day to attend." };
  }
  return { days };
}

// Only this Attendee's view of the Event changed; public lists carry no
// attendee counts, so they stay cached.
function invalidateAttendance(id: string, userId: string) {
  [
    `event-${id}`,
    `event-questions-${id}`,
    `user-attendance-${userId}-${id}`,
    `user-events-${userId}`,
    `user-responses-${id}-${userId}`,
  ].forEach((tag) => updateTag(tag));
}

// The Attend button and the registration form both end here, and the Event's
// own rules decide: one that requires registration enforces its capacity,
// camp days and required questions, so a bare attend cannot skip them.
// Attending again updates the registration and never counts twice.
export async function attendEvent(
  id: string,
  registration: Registration = {},
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { userId } = await resolveWrite(opts);
  if (!userId) return { error: SIGNED_OUT };

  // Every refusal returns before the first write, so nothing commits with it.
  const result = await prisma.$transaction(
    async (tx): Promise<{ error: string } | Done> => {
      await lockEvent(tx, id);
      const event = await tx.event.findUnique({
        where: { id },
        select: {
          isDraft: true,
          cancelledAt: true,
          datetime: true,
          requiresRegistration: true,
          metadata: true,
        },
      });
      if (!event || !isPubliclyVisible(event)) {
        return { error: "Event not found." };
      }
      if (event.cancelledAt) return { error: CANCELLED };

      const existing = await tx.eventAttendee.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
        select: { id: true },
      });

      if (!event.requiresRegistration) {
        if (!existing) {
          await tx.eventAttendee.create({ data: { eventId: id, userId } });
        }
      } else {
        const meta = parseEventMetadata(event.metadata);
        const camp = campDays(
          event.datetime,
          meta.camp,
          registration.selectedDays
        );
        if ("error" in camp) return camp;
        const answers = await checkAnswers(
          tx,
          id,
          registration.responses ?? []
        );
        if ("error" in answers) return answers;

        const { capacity } = meta.registration;
        if (
          !existing &&
          capacity != null &&
          (await tx.eventAttendee.count({ where: { eventId: id } })) >= capacity
        ) {
          return { error: FULLY_BOOKED };
        }

        const details = {
          phone: registration.phone,
          notes: registration.notes,
          ...(camp.days ? { metadata: { selectedDays: camp.days } } : {}),
        };
        const attendee = existing
          ? await tx.eventAttendee.update({
              where: { id: existing.id },
              data: details,
              select: { id: true },
            })
          : await tx.eventAttendee.create({
              data: { eventId: id, userId, ...details },
              select: { id: true },
            });
        await saveAnswers(tx, attendee.id, answers);
      }

      await syncReminders(tx, id, { userId });
      return {};
    }
  );
  if ("error" in result) return result;

  invalidateAttendance(id, userId);
  return {};
}

// Leaving is always allowed, even once the Event is cancelled or gone, and
// leaving twice changes nothing. Answers go with the Attendee.
export async function unattendEvent(
  id: string,
  opts?: WriteOptions
): Promise<{ error: string } | Done> {
  const { userId } = await resolveWrite(opts);
  if (!userId) return { error: SIGNED_OUT };

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, id);
    await tx.eventAttendee.deleteMany({ where: { eventId: id, userId } });
    await syncReminders(tx, id, { userId });
  });

  invalidateAttendance(id, userId);
  return {};
}

// ---------------------------------------------------------------------------
// A user's reminder preference changed
//
// Takes the caller's transaction, so the preference and the reminders that
// follow from it commit together. Each upcoming Event the user attends gets
// their reminder re-synced at the new lead time, including one the old lead
// time had already skipped.

export async function reminderPreferenceChanged(tx: Db, userId: string) {
  const events = await tx.event.findMany({
    where: {
      attendees: { some: { userId } },
      datetime: { gt: new Date() },
      isDraft: false,
      cancelledAt: null,
    },
    select: { id: true },
  });
  for (const { id } of events) await syncReminders(tx, id, { userId });
}

// ---------------------------------------------------------------------------
// Series changes that reach their Events
//
// Trusted: the Series module has already checked that the user may delete or
// move the Series. A second Ability check here would refuse a Church admin
// whenever one of the Events carries someone else's Creator Grant, breaking
// the very cascade these keep. Each takes the Series module's transaction, so
// it only runs inside one, and returns what to invalidate once that commits.

type AfterCommit = () => void;

function seriesEvents(tx: Db, seriesId: string) {
  return tx.event.findMany({
    where: { seriesId },
    select: { id: true, churchId: true },
  });
}

// The Series is about to be deleted: its Events stay, as standalone Events in
// the same Church, and its followers hear nothing more about them.
export async function seriesDeleted(
  tx: Db,
  seriesId: string
): Promise<AfterCommit> {
  const events = await seriesEvents(tx, seriesId);
  if (events.length > 0)
    await cancelManyNotifications(
      {
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: events.map((e) => seriesSessionKey(seriesId, e.id)),
      },
      tx
    );
  await tx.event.updateMany({ where: { seriesId }, data: { seriesId: null } });

  return () =>
    invalidate(
      ...events.map((e) => ({
        id: e.id,
        churchIds: [e.churchId],
        seriesIds: [seriesId],
      }))
    );
}

// The Series moved Church: an Event in a Series always lives in that Series'
// Church, so its Events move too and the Role cascade follows them.
export async function seriesMovedChurch(
  tx: Db,
  seriesId: string,
  churchId: string
): Promise<AfterCommit> {
  const events = await seriesEvents(tx, seriesId);
  await tx.event.updateMany({ where: { seriesId }, data: { churchId } });

  return () =>
    invalidate(
      ...events.map((e) => ({
        id: e.id,
        churchIds: [e.churchId, churchId],
        seriesIds: [seriesId],
        listsChanged: true,
      }))
    );
}
