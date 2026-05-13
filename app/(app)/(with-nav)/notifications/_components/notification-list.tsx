"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationItem } from "@/components/notifications/notification-item";
import { markReadAction } from "@/lib/actions/notifications";
import type { InboxNotification } from "@/lib/notifications/inbox";

export function NotificationList({
  notifications,
}: {
  notifications: InboxNotification[];
}) {
  const hasUnread = notifications.some((n) => n.readAt === null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (hasUnread) {
      startTransition(async () => {
        await markReadAction().catch((err) =>
          console.error("[NotificationList] markReadAction failed:", err)
        );
        router.refresh();
      });
    }
  }, [hasUnread, router]);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Bell className="text-muted-foreground/40 size-10" />
        <p className="text-base font-semibold">No notifications yet</p>
        <p className="text-muted-foreground text-sm">
          You&apos;re all caught up
        </p>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </div>
  );
}
