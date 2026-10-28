import Link from "next/link";
import { type ElementType } from "react";
import { Bell, CalendarX, Repeat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { InboxNotification } from "@/domains/notifications/inbox";

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
      <ItemMedia className="bg-primary/10 size-7 rounded-full">
        <Icon className="text-primary size-3.5" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className={isUnread ? "font-semibold" : "font-medium"}>
          {notification.title}
        </ItemTitle>
        <ItemDescription>{notification.body}</ItemDescription>
        <p className="text-muted-foreground/70 text-xs">
          {formatDistanceToNow(new Date(notification.sentAt), {
            addSuffix: true,
          })}
        </p>
      </ItemContent>
      {isUnread && (
        <ItemActions className="self-start pt-1.5">
          <span className="bg-primary size-2 rounded-full" />
        </ItemActions>
      )}
    </>
  );

  if (href) {
    return (
      <Item
        size="sm"
        className="active:bg-muted/50 items-start gap-3 rounded-none"
        asChild
      >
        <Link href={href}>{content}</Link>
      </Item>
    );
  }

  return (
    <Item size="sm" className="items-start gap-3">
      {content}
    </Item>
  );
}
