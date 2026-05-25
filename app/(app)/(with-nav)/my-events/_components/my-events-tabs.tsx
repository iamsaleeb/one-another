"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getUserFollowedSeries } from "@/domains/series/actions/data";
import type { EventCardItem } from "@/types/pagination";
import { MyEventsTab } from "./my-events-tab";
import { MySeriesTab } from "./my-series-tab";
import { MySavedTab } from "./my-saved-tab";

interface MyEventsTabsProps {
  upcomingItems: EventCardItem[];
  upcomingCursor: string | null;
  pastItems: EventCardItem[];
  pastCursor: string | null;
  followedSeries: Awaited<ReturnType<typeof getUserFollowedSeries>>;
  savedItems: EventCardItem[];
  savedCursor: string | null;
}

export function MyEventsTabs({
  upcomingItems,
  upcomingCursor,
  pastItems,
  pastCursor,
  followedSeries,
  savedItems,
  savedCursor,
}: MyEventsTabsProps) {
  return (
    <Tabs defaultValue="events">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
      </div>
      <div className="px-4 pt-5">
        <TabsContent value="events">
          <MyEventsTab
            upcomingItems={upcomingItems}
            upcomingCursor={upcomingCursor}
            pastItems={pastItems}
            pastCursor={pastCursor}
          />
        </TabsContent>
        <TabsContent value="series">
          <MySeriesTab series={followedSeries} />
        </TabsContent>
        <TabsContent value="saved">
          <MySavedTab savedItems={savedItems} savedCursor={savedCursor} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
