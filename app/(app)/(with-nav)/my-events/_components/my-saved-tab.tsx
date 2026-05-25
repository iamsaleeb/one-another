import { InfiniteEventList } from "@/components/infinite-event-list";
import { loadMoreMySavedEventsAction } from "@/lib/actions/events-pagination";
import type { EventCardItem } from "@/types/pagination";

interface MySavedTabProps {
  savedItems: EventCardItem[];
  savedCursor: string | null;
}

export function MySavedTab({ savedItems, savedCursor }: MySavedTabProps) {
  return (
    <InfiniteEventList
      initialItems={savedItems}
      initialCursor={savedCursor}
      loadMore={loadMoreMySavedEventsAction}
      title="Saved"
      emptyMessage="No saved events"
    />
  );
}
