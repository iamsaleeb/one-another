import type { ChurchRole, EventRole, SeriesRole } from "@prisma/client";
import type { Capability } from "./capabilities";

export const CHURCH_ROLE_CAPABILITIES = {
  CHURCH_ADMIN: [
    "church:manage",
    "church:manage_members",
    "event:create",
    "event:update",
    "event:publish",
    "event:delete",
    "event:manage_staff",
    "event:view_attendees",
    "event:scan_attendees",
    "series:create",
    "series:update",
    "series:delete",
  ],
  EVENT_MANAGER: [
    "event:create",
    "event:update",
    "event:publish",
    "event:delete",
    "event:manage_staff",
    "event:view_attendees",
    "event:scan_attendees",
    "series:create",
    "series:update",
    "series:delete",
  ],
  EVENT_CREATOR: ["event:create"],
} satisfies Record<ChurchRole, Capability[]>;

export const EVENT_ROLE_CAPABILITIES = {
  EVENT_MANAGER: [
    "event:update",
    "event:manage_staff",
    "event:view_attendees",
    "event:scan_attendees",
  ],
  EVENT_EDITOR: ["event:update"],
} satisfies Record<EventRole, Capability[]>;

export const SERIES_ROLE_CAPABILITIES = {
  SERIES_MANAGER: ["series:update", "event:create", "event:update"],
  SERIES_SESSION_CREATOR: ["event:create", "event:update"],
} satisfies Record<SeriesRole, Capability[]>;
