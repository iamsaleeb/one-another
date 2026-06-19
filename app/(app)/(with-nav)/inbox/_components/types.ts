export type InboxFilter = "all" | "unread" | "requests";

export const isInboxFilter = (v: string): v is InboxFilter =>
  v === "all" || v === "unread" || v === "requests";
