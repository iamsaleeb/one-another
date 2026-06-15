"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NotificationList } from "./notification-list";
import type { InboxNotification } from "@/domains/notifications/inbox";

type InboxFilter = "all" | "unread" | "requests";

const isInboxFilter = (v: string): v is InboxFilter =>
  v === "all" || v === "unread" || v === "requests";

export function InboxTabs({
  initialNotifications,
  hasMore,
}: {
  initialNotifications: InboxNotification[];
  hasMore: boolean;
}) {
  const [active, setActive] = useState<InboxFilter>("all");

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={active}
          onValueChange={(value) => {
            if (isInboxFilter(value)) setActive(value);
          }}
        >
          <ToggleGroupItem
            value="all"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="unread"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Unread
          </ToggleGroupItem>
          <ToggleGroupItem
            value="requests"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Requests
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <NotificationList
        initialNotifications={initialNotifications}
        hasMore={hasMore}
        filter={active}
      />
    </div>
  );
}
