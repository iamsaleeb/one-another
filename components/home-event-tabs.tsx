"use client";

import { CalendarDays, LogIn } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InfiniteEventList } from "@/components/infinite-event-list";
import { EmptyState } from "@/components/empty-state";
import type { EventCardItem, LoadMoreFn } from "@/types/pagination";

interface HomeEventTabsProps {
  defaultTab: "followed" | "other";
  followedPage: { items: EventCardItem[]; nextCursor: string | null };
  otherPage: { items: EventCardItem[]; nextCursor: string | null };
  isAuthenticated: boolean;
  loadMoreFollowed: LoadMoreFn;
  loadMoreOther: LoadMoreFn;
}

export function HomeEventTabs({
  defaultTab,
  followedPage,
  otherPage,
  isAuthenticated,
  loadMoreFollowed,
  loadMoreOther,
}: HomeEventTabsProps) {
  return (
    <>
      {/* defaultValue intentionally used: tab state is seeded once from server, then owned by Radix */}
      <Tabs defaultValue={defaultTab}>
      <TabsList className="w-full">
        <TabsTrigger value="followed" className="flex-1">
          Your churches
        </TabsTrigger>
        <TabsTrigger value="other" className="flex-1">
          Other events
        </TabsTrigger>
      </TabsList>

      <TabsContent value="followed" className="mt-4">
        {!isAuthenticated ? (
          <EmptyState
            icon={LogIn}
            label="Sign in to follow churches and see their events here"
          />
        ) : (
          <InfiniteEventList
            initialItems={followedPage.items}
            initialCursor={followedPage.nextCursor}
            loadMore={loadMoreFollowed}
            emptyMessage="No upcoming events from churches you follow"
          />
        )}
      </TabsContent>

      <TabsContent value="other" className="mt-4">
        <InfiniteEventList
          initialItems={otherPage.items}
          initialCursor={otherPage.nextCursor}
          loadMore={loadMoreOther}
          emptyMessage="No upcoming events"
        />
      </TabsContent>
      </Tabs>
    </>
  );
}
