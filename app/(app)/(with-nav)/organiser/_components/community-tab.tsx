import Link from "next/link";
import { Repeat } from "lucide-react";
import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadMoreCommunityEventsAction } from "@/domains/events/actions/pagination";
import type { getSeriesNotByCreator } from "@/domains/series/actions/data";
import type { EventCardItem } from "@/lib/types/pagination";
import { CADENCE_LABELS } from "@/lib/types/search";

interface CommunityTabProps {
  items: EventCardItem[];
  cursor: string | null;
  series: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function CommunityTab({ items, cursor, series }: CommunityTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <InfiniteEventList
        initialItems={items}
        initialCursor={cursor}
        loadMore={loadMoreCommunityEventsAction}
        title="Events"
        emptyMessage="No events from others"
        isAuthenticated={true}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Series</h2>
        {series.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Repeat />
              </EmptyMedia>
              <EmptyTitle>No series from others</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="soft">
                      {s.createdBy?.name ?? "Unknown"}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base leading-snug font-bold">{s.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {CADENCE_LABELS[s.cadence] ?? s.cadence}
                  </p>
                  <p className="text-muted-foreground text-sm">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
