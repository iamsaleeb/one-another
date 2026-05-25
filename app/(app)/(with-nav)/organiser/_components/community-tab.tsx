import Link from "next/link";
import { Repeat } from "lucide-react";
import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { loadMoreCommunityEventsAction } from "@/domains/events/actions/pagination";
import type { getSeriesNotByCreator } from "@/lib/actions/data-series";
import type { EventCardItem } from "@/types/pagination";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

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
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Series</h2>
        {series.length === 0 ? (
          <EmptyState icon={Repeat} label="No series from others" />
        ) : (
          series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {s.createdBy?.name ?? "Unknown"}
                    </span>
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
