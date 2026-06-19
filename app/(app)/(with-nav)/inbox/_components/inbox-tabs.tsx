"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { NotificationList } from "./notification-list";
import type { InboxNotification } from "@/domains/notifications/inbox";
import { isInboxFilter, type InboxFilter } from "./types";

export function InboxTabs({
  initialNotifications,
  hasMore,
}: {
  initialNotifications: InboxNotification[];
  hasMore: boolean;
}) {
  const [active, setActive] = useState<InboxFilter>("all");

  // Key resets NotificationList state when the server delivers refreshed data
  // (e.g. after markReadAction + router.refresh() changes readAt values).
  // Changes on item count changes or when the first item's readAt flips.
  const listKey = `${initialNotifications.length}-${initialNotifications[0]?.readAt ?? "unread"}`;

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={active}
          onValueChange={(value) => {
            // Empty string means clicking the active item (deselect attempt); keep current tab
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
        key={listKey}
        initialNotifications={initialNotifications}
        hasMore={hasMore}
        filter={active}
      />
    </div>
  );
}
