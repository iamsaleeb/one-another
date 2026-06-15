"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import { loadMoreMyUpcomingEventsAction } from "@/domains/events/actions/pagination";
import type { getUserFollowedSeries } from "@/domains/series/actions/data";
import type { EventCardItem } from "@/lib/types/pagination";
import { MySeriesTab } from "./my-series-tab";

type ActiveFilter = "events" | "series";

const isActiveFilter = (v: string): v is ActiveFilter =>
  v === "events" || v === "series";

interface MyEventsTabsProps {
  upcomingItems: EventCardItem[];
  upcomingCursor: string | null;
  followedSeries: Awaited<ReturnType<typeof getUserFollowedSeries>>;
}

export function MyEventsTabs({
  upcomingItems,
  upcomingCursor,
  followedSeries,
}: MyEventsTabsProps) {
  const [active, setActive] = useState<ActiveFilter>("events");

  return (
    <div className="flex flex-col gap-5 px-4 pt-2">
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
            value="events"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Events
          </ToggleGroupItem>
          <ToggleGroupItem
            value="series"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Series
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {active === "events" && (
        <InfiniteEventList
          initialItems={upcomingItems}
          initialCursor={upcomingCursor}
          loadMore={loadMoreMyUpcomingEventsAction}
          emptyMessage="No upcoming events"
          isAuthenticated={true}
        />
      )}
      {active === "series" && <MySeriesTab series={followedSeries} />}
    </div>
  );
}
