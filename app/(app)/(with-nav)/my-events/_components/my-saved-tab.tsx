import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import { loadMoreMySavedEventsAction } from "@/domains/events/actions/pagination";
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
