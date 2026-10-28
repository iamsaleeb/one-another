"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import { NotificationItem } from "@/domains/notifications/components/notification-item";
import {
  markReadAction,
  loadMoreNotificationsAction,
} from "@/domains/notifications/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
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
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>No requests yet</EmptyTitle>
          <EmptyDescription>
            Workflow approvals and other requests will appear here
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const displayed =
    filter === "unread"
      ? notifications.filter((n) => n.readAt === null)
      : notifications;

  if (displayed.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bell />
          </EmptyMedia>
          <EmptyTitle>
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </EmptyTitle>
          <EmptyDescription>You&apos;re all caught up</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
        {displayed.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLoadMore}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner />
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
