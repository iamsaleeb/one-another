"use client";

import { LogIn } from "lucide-react";
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
  // defaultValue intentionally used: tab state is seeded once from server, then owned by Radix
  return (
    <Tabs defaultValue={defaultTab}>
      <div className="bg-muted/20 sticky top-0 z-10 pt-2 backdrop-blur-sm">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="followed">Your churches</TabsTrigger>
          <TabsTrigger value="other">Other events</TabsTrigger>
        </TabsList>
      </div>

      <div className="pt-5">
        <TabsContent value="followed">
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

        <TabsContent value="other">
          <InfiniteEventList
            initialItems={otherPage.items}
            initialCursor={otherPage.nextCursor}
            loadMore={loadMoreOther}
            emptyMessage="No upcoming events"
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
