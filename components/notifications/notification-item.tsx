import Link from 'next/link';
import { type ElementType } from 'react';
import { Bell, CalendarX, Repeat } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { InboxNotification } from '@/lib/notifications/inbox';

const TYPE_ICON: Record<string, ElementType> = {
  EVENT_REMINDER: Bell,
  NEW_SERIES_SESSION: Repeat,
  EVENT_CANCELLED: CalendarX,
};

function getHref(type: string, data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.eventId === 'string') return `/events/${d.eventId}`;
  if (typeof d.seriesId === 'string') return `/series/${d.seriesId}`;
  return null;
}

export function NotificationItem({ notification }: { notification: InboxNotification }) {
  const isUnread = notification.readAt === null;
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const href = getHref(notification.type, notification.data);

  const content = (
    <>
      <div className="mt-0.5 shrink-0 size-7 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="size-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : 'font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{notification.body}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
        </p>
      </div>
      {isUnread && (
        <span className="mt-1.5 shrink-0 size-2 rounded-full bg-primary" />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="px-4 py-3 flex items-start gap-3 active:bg-muted/50">
        {content}
      </Link>
    );
  }

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      {content}
    </div>
  );
}
