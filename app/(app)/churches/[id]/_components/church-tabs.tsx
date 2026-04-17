"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getChurchById } from "@/lib/actions/data-churches";
import { AboutTab } from "./about-tab";
import { EventsTab } from "./events-tab";
import { ServicesTab } from "./services-tab";
import { SeriesTab } from "./series-tab";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface ChurchTabsProps {
  church: ChurchWithDetails;
}

export function ChurchTabs({ church }: ChurchTabsProps) {
  return (
    <Tabs defaultValue="about">
      <div className="px-4 sticky top-0 z-10 bg-muted/20 backdrop-blur-sm pt-2">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
      </div>

      <div className="px-4 pt-5">
        <TabsContent value="about">
          <AboutTab church={church} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab church={church} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab events={church.events} />
        </TabsContent>

        <TabsContent value="series">
          <SeriesTab series={church.series} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
