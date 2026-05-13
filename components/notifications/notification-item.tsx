import Link from "next/link";
import { type ElementType } from "react";
import { Bell, CalendarX, Repeat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { InboxNotification } from "@/lib/notifications/inbox";

const TYPE_ICON: Record<string, ElementType> = {
  EVENT_REMINDER: Bell,
  NEW_SERIES_SESSION: Repeat,
  EVENT_CANCELLED: CalendarX,
};

function getHref(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.eventId === "string") return `/events/${d.eventId}`;
  if (typeof d.seriesId === "string") return `/series/${d.seriesId}`;
  return null;
}

export function NotificationItem({
  notification,
}: {
  notification: InboxNotification;
}) {
  const isUnread = notification.readAt === null;
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const href = getHref(notification.data);

  const content = (
    <>
      <div className="bg-primary/10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
        <Icon className="text-primary size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${isUnread ? "font-semibold" : "font-medium"}`}
        >
          {notification.title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {notification.body}
        </p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          {formatDistanceToNow(new Date(notification.sentAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      {isUnread && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="active:bg-muted/50 flex items-start gap-3 px-4 py-3"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-start gap-3 px-4 py-3">{content}</div>;
}
