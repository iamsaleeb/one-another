"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getSeriesNotByCreator } from "@/domains/series/actions/data";
import type { ManageableSeries } from "@/domains/series/dal/manageable";
import type { EventCardItem } from "@/lib/types/pagination";
import { MyContentTab } from "./my-content-tab";
import { CommunityTab } from "./community-tab";

interface OrganiserTabsProps {
  myItems: EventCardItem[];
  myCursor: string | null;
  mySeries: ManageableSeries;
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
          <TabsTrigger value="my-content">Manage</TabsTrigger>
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
