export const Capabilities = {
  EVENT_CREATE: "event:create",
  EVENT_UPDATE: "event:update",
  EVENT_PUBLISH: "event:publish",
  EVENT_DELETE: "event:delete",
  EVENT_MANAGE_STAFF: "event:manage_staff",
  EVENT_VIEW_ATTENDEES: "event:view_attendees",
  EVENT_SCAN_ATTENDEES: "event:scan_attendees",
  CHURCH_MANAGE: "church:manage",
  CHURCH_MANAGE_MEMBERS: "church:manage_members",
  PLATFORM_ADMIN: "platform:admin",
} as const;

export type Capability = (typeof Capabilities)[keyof typeof Capabilities];
