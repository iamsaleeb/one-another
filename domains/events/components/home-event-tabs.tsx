"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InfiniteEventList } from "./infinite-event-list";
import type { EventCardItem, LoadMoreFn } from "@/lib/types/pagination";

type ActiveTab = "followed" | "other" | "saved";

interface HomeEventTabsProps {
  defaultTab: "followed" | "other";
  followedPage: { items: EventCardItem[]; nextCursor: string | null };
  otherPage: { items: EventCardItem[]; nextCursor: string | null };
  savedPage: { items: EventCardItem[]; nextCursor: string | null };
  isAuthenticated: boolean;
  loadMoreFollowed: LoadMoreFn;
  loadMoreOther: LoadMoreFn;
  loadMoreSaved: LoadMoreFn;
}

export function HomeEventTabs({
  defaultTab,
  followedPage,
  otherPage,
  savedPage,
  isAuthenticated,
  loadMoreFollowed,
  loadMoreOther,
  loadMoreSaved,
}: HomeEventTabsProps) {
  const [active, setActive] = useState<ActiveTab>(defaultTab);

  if (!isAuthenticated) {
    return (
      <InfiniteEventList
        initialItems={otherPage.items}
        initialCursor={otherPage.nextCursor}
        loadMore={loadMoreOther}
        emptyMessage="No upcoming events"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted/20 sticky top-0 z-10 pt-2 backdrop-blur-sm">
        <div className="group/toggle-group flex w-fit items-center gap-2 rounded-md">
          <Button
            variant="outline"
            size="default"
            onClick={() => setActive("followed")}
            data-state={active === "followed" ? "on" : "off"}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Your churches
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setActive("other")}
            data-state={active === "other" ? "on" : "off"}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            All events
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => setActive("saved")}
            data-state={active === "saved" ? "on" : "off"}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Saved
          </Button>
        </div>
      </div>

      {active === "followed" && (
        <InfiniteEventList
          initialItems={followedPage.items}
          initialCursor={followedPage.nextCursor}
          loadMore={loadMoreFollowed}
          emptyMessage="No upcoming events from churches you follow"
        />
      )}
      {active === "other" && (
        <InfiniteEventList
          initialItems={otherPage.items}
          initialCursor={otherPage.nextCursor}
          loadMore={loadMoreOther}
          emptyMessage="No upcoming events"
        />
      )}
      {active === "saved" && (
        <InfiniteEventList
          initialItems={savedPage.items}
          initialCursor={savedPage.nextCursor}
          loadMore={loadMoreSaved}
          emptyMessage="No saved events"
        />
      )}
    </div>
  );
}
