"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InfiniteEventList } from "./infinite-event-list";
import type { EventCardItem, LoadMoreFn } from "@/lib/types/pagination";

type ActiveFilter = "followed" | "other" | "saved";

const isActiveFilter = (v: string): v is ActiveFilter =>
  v === "followed" || v === "other" || v === "saved";

interface HomeEventTabsProps {
  defaultFilter: "followed" | "other";
  followedPage: { items: EventCardItem[]; nextCursor: string | null };
  otherPage: { items: EventCardItem[]; nextCursor: string | null };
  savedPage: { items: EventCardItem[]; nextCursor: string | null };
  isAuthenticated: boolean;
  loadMoreFollowed: LoadMoreFn;
  loadMoreOther: LoadMoreFn;
  loadMoreSaved: LoadMoreFn;
}

export function HomeEventTabs({
  defaultFilter,
  followedPage,
  otherPage,
  savedPage,
  isAuthenticated,
  loadMoreFollowed,
  loadMoreOther,
  loadMoreSaved,
}: HomeEventTabsProps) {
  const [active, setActive] = useState<ActiveFilter>(defaultFilter);

  if (!isAuthenticated) {
    return (
      <InfiniteEventList
        initialItems={otherPage.items}
        initialCursor={otherPage.nextCursor}
        loadMore={loadMoreOther}
        emptyMessage="No upcoming events"
        isAuthenticated={false}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted/20 sticky top-0 z-10 pt-2 backdrop-blur-sm">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={active}
          onValueChange={(value) => {
            if (isActiveFilter(value)) setActive(value);
          }}
        >
          <ToggleGroupItem
            value="followed"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Your churches
          </ToggleGroupItem>
          <ToggleGroupItem
            value="other"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            All events
          </ToggleGroupItem>
          <ToggleGroupItem
            value="saved"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Saved
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {active === "followed" && (
        <InfiniteEventList
          initialItems={followedPage.items}
          initialCursor={followedPage.nextCursor}
          loadMore={loadMoreFollowed}
          emptyMessage="No upcoming events from churches you follow"
          isAuthenticated={isAuthenticated}
        />
      )}
      {active === "other" && (
        <InfiniteEventList
          initialItems={otherPage.items}
          initialCursor={otherPage.nextCursor}
          loadMore={loadMoreOther}
          emptyMessage="No upcoming events"
          isAuthenticated={isAuthenticated}
        />
      )}
      {active === "saved" && (
        <InfiniteEventList
          initialItems={savedPage.items}
          initialCursor={savedPage.nextCursor}
          loadMore={loadMoreSaved}
          emptyMessage="No saved events"
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}
