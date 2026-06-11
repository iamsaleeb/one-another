import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import {
  loadMoreMyUpcomingEventsAction,
  loadMoreMyPastEventsAction,
} from "@/domains/events/actions/pagination";
import type { EventCardItem } from "@/lib/types/pagination";

interface MyEventsTabProps {
  upcomingItems: EventCardItem[];
  upcomingCursor: string | null;
  pastItems: EventCardItem[];
  pastCursor: string | null;
}

export function MyEventsTab({
  upcomingItems,
  upcomingCursor,
  pastItems,
  pastCursor,
}: MyEventsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <InfiniteEventList
        initialItems={upcomingItems}
        initialCursor={upcomingCursor}
        loadMore={loadMoreMyUpcomingEventsAction}
        title="Upcoming"
        emptyMessage="No upcoming events"
        isAuthenticated={true}
      />
      <InfiniteEventList
        initialItems={pastItems}
        initialCursor={pastCursor}
        loadMore={loadMoreMyPastEventsAction}
        title="Past"
        emptyMessage="No past events"
        isAuthenticated={true}
      />
    </div>
  );
}
