import { AbilityBuilder, subject } from "@casl/ability";
import {
  createPrismaAbility,
  type PrismaAbility,
  type PrismaQuery,
  type Subjects,
} from "@casl/prisma";
import type {
  Church,
  ChurchRole,
  Event,
  EventRole,
  Series,
  SeriesRole,
} from "@prisma/client";
import type { Grants } from "./grants";

export type Action =
  | "create"
  | "update"
  | "publish"
  | "delete"
  | "manage_staff"
  | "view_attendees"
  | "scan_attendees"
  | "manage_members"
  // On Church/Series: "may create an Event here". Mirrors the Event `create`
  // rules so pickers can use accessibleBy; pinned by the consistency test.
  | "create_event"
  // On Church: "may create a Series here". Mirrors the Series `create` rules.
  | "create_series"
  | "manage";

export type AppSubjects =
  | Subjects<{ Event: Event; Series: Series; Church: Church }>
  | "all";

export type AppAbility = PrismaAbility<[Action, AppSubjects], PrismaQuery>;

type Can = AbilityBuilder<AppAbility>["can"];

const ALL_EVENT_ACTIONS: Action[] = [
  "create",
  "update",
  "publish",
  "delete",
  "manage_staff",
  "view_attendees",
  "scan_attendees",
];

const EVENT_STAFF_ACTIONS: Action[] = [
  "update",
  "publish",
  "delete",
  "manage_staff",
  "view_attendees",
  "scan_attendees",
];

const EDIT_EVENT_ACTIONS: Action[] = ["update", "publish", "delete"];

// Church Grants cascade to every Series and Event in the Church.
const CHURCH_RULES = {
  CHURCH_ADMIN: (can, churchId) => {
    can(["update", "manage_members"], "Church", { id: churchId });
    can(ALL_EVENT_ACTIONS, "Event", { churchId });
    can(["create", "update", "delete"], "Series", { churchId });
    can("create_series", "Church", { id: churchId });
    can("create_event", "Church", { id: churchId });
    can("create_event", "Series", { churchId });
  },
  EVENT_MANAGER: (can, churchId) => {
    can(ALL_EVENT_ACTIONS, "Event", { churchId });
    can(["create", "update", "delete"], "Series", { churchId });
    can("create_series", "Church", { id: churchId });
    can("create_event", "Church", { id: churchId });
    can("create_event", "Series", { churchId });
  },
  EVENT_CREATOR: (can, churchId) => {
    can("create", "Event", { churchId });
    can("create_event", "Church", { id: churchId });
    can("create_event", "Series", { churchId });
  },
} satisfies Record<ChurchRole, (can: Can, churchId: string) => void>;

// Series Grants cascade to every Event in the Series.
const SERIES_RULES = {
  SERIES_MANAGER: (can, seriesId) => {
    can("update", "Series", { id: seriesId });
    can(["create", ...EDIT_EVENT_ACTIONS], "Event", { seriesId });
    can("create_event", "Series", { id: seriesId });
  },
  SERIES_SESSION_CREATOR: (can, seriesId) => {
    can("create", "Event", { seriesId });
    can("create_event", "Series", { id: seriesId });
  },
} satisfies Record<SeriesRole, (can: Can, seriesId: string) => void>;

const EVENT_RULES = {
  EVENT_MANAGER: (can, eventId) => {
    can(EVENT_STAFF_ACTIONS, "Event", { id: eventId });
  },
  EVENT_EDITOR: (can, eventId) => {
    can(EDIT_EVENT_ACTIONS, "Event", { id: eventId });
  },
} satisfies Record<EventRole, (can: Can, eventId: string) => void>;

// Pure: Grants in, Ability out. `null` is a guest, who may do nothing.
export function buildAbility(grants: Grants | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);
  if (grants?.isPlatformAdmin) can("manage", "all");
  for (const g of grants?.church ?? []) CHURCH_RULES[g.role](can, g.churchId);
  for (const g of grants?.series ?? []) SERIES_RULES[g.role](can, g.seriesId);
  for (const g of grants?.event ?? []) EVENT_RULES[g.role](can, g.eventId);
  return build();
}

// Typed subjects. Each requires every field the rules read, so a record loaded
// with a too-narrow `select` fails to compile instead of silently denying.
// An Event without `id` is a placement target ("could an Event go here?").
export function eventSubject(
  event: Pick<Event, "churchId" | "seriesId"> & { id?: string }
) {
  return subject("Event", event as Event);
}

export function seriesSubject(
  series: Pick<Series, "churchId"> & { id?: string }
) {
  return subject("Series", series as Series);
}

export function churchSubject(church: Pick<Church, "id">) {
  return subject("Church", church as Church);
}

// True when the user holds any Grant at all (organiser gate).
export function hasAnyGrant(ability: AppAbility): boolean {
  return ability.rules.length > 0;
}
