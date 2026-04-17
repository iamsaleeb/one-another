"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getEventsByCreator, getEventsNotByCreator } from "@/lib/actions/data-events";
import type { getSeriesByCreator, getSeriesNotByCreator } from "@/lib/actions/data-series";
import { MyContentTab } from "./my-content-tab";
import { CommunityTab } from "./community-tab";

interface OrganiserTabsProps {
  myEvents: Awaited<ReturnType<typeof getEventsByCreator>>;
  mySeries: Awaited<ReturnType<typeof getSeriesByCreator>>;
  communityEvents: Awaited<ReturnType<typeof getEventsNotByCreator>>;
  communitySeries: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function OrganiserTabs({ myEvents, mySeries, communityEvents, communitySeries }: OrganiserTabsProps) {
  return (
    <Tabs defaultValue="my-content">
      <div className="px-4 sticky top-0 z-10 bg-muted/20 backdrop-blur-sm pt-2">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="my-content">My Content</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
      </div>

      <div className="px-4 pt-5">
        <TabsContent value="my-content">
          <MyContentTab events={myEvents} series={mySeries} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityTab events={communityEvents} series={communitySeries} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
