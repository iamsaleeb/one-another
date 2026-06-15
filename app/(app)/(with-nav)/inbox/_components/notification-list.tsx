"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox, Loader2 } from "lucide-react";
import { NotificationItem } from "@/domains/notifications/components/notification-item";
import {
  markReadAction,
  loadMoreNotificationsAction,
} from "@/domains/notifications/actions/notifications";
import { Button } from "@/components/ui/button";
import type { InboxNotification } from "@/domains/notifications/inbox";
import type { InboxFilter } from "./types";

export function NotificationList({
  initialNotifications,
  hasMore: initialHasMore,
  filter = "all",
}: {
  initialNotifications: InboxNotification[];
  hasMore: boolean;
  filter?: InboxFilter;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const hasUnread = notifications.some((n) => n.readAt === null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (hasUnread && filter === "all") {
      startTransition(async () => {
        await markReadAction().catch((err) =>
          console.error("[NotificationList] markReadAction failed:", err)
        );
        router.refresh();
      });
    }
  }, [hasUnread, filter, router]);

  function handleLoadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await loadMoreNotificationsAction(nextPage);
      setNotifications((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    });
  }

  if (filter === "requests") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Inbox className="text-muted-foreground/40 size-10" />
        <p className="text-base font-semibold">No requests yet</p>
        <p className="text-muted-foreground text-sm">
          Workflow approvals and other requests will appear here
        </p>
      </div>
    );
  }

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => n.readAt === null)
      : notifications;

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Bell className="text-muted-foreground/40 size-10" />
        <p className="text-base font-semibold">
          {filter === "unread"
            ? "No unread notifications"
            : "No notifications yet"}
        </p>
        <p className="text-muted-foreground text-sm">
          You&apos;re all caught up
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
        {displayed.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
      {hasMore && filter !== "requests" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLoadMore}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load more"
          )}
        </Button>
      )}
    </div>
  );
}
