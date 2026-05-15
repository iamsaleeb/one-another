"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  getSeriesByCreator,
  getSeriesNotByCreator,
} from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";
import { MyContentTab } from "./my-content-tab";
import { CommunityTab } from "./community-tab";

interface OrganiserTabsProps {
  myItems: EventCardItem[];
  myCursor: string | null;
  mySeries: Awaited<ReturnType<typeof getSeriesByCreator>>;
  communityItems: EventCardItem[];
  communityCursor: string | null;
  communitySeries: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function OrganiserTabs({
  myItems,
  myCursor,
  mySeries,
  communityItems,
  communityCursor,
  communitySeries,
}: OrganiserTabsProps) {
  return (
    <Tabs defaultValue="my-content">
      <div className="bg-muted/20 sticky top-0 z-10 px-4 pt-2 backdrop-blur-sm">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="my-content">My Content</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
      </div>

      <div className="px-4 pt-5">
        <TabsContent value="my-content">
          <MyContentTab items={myItems} cursor={myCursor} series={mySeries} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityTab
            items={communityItems}
            cursor={communityCursor}
            series={communitySeries}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
