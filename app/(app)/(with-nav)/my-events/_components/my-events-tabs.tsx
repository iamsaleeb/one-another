"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getUserAttendedEvents, getUserAttendedPastEvents } from "@/lib/actions/data-events";
import type { getUserFollowedSeries } from "@/lib/actions/data-series";
import { MyEventsTab } from "./my-events-tab";
import { MySeriesTab } from "./my-series-tab";

interface MyEventsTabsProps {
  upcomingEvents: Awaited<ReturnType<typeof getUserAttendedEvents>>;
  pastEvents: Awaited<ReturnType<typeof getUserAttendedPastEvents>>;
  followedSeries: Awaited<ReturnType<typeof getUserFollowedSeries>>;
}

export function MyEventsTabs({ upcomingEvents, pastEvents, followedSeries }: MyEventsTabsProps) {
  return (
    <Tabs defaultValue="events">
      <div className="px-4 sticky top-0 z-10 bg-muted/20 backdrop-blur-sm pt-2">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
      </div>
      <div className="px-4 pt-5">
        <TabsContent value="events">
          <MyEventsTab upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
        </TabsContent>
        <TabsContent value="series">
          <MySeriesTab series={followedSeries} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
