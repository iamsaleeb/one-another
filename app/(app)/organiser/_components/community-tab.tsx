import Link from "next/link";
import { CalendarDays, Repeat } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import type { getEventsNotByCreator } from "@/lib/actions/data-events";
import type { getSeriesNotByCreator } from "@/lib/actions/data-series";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

interface CommunityTabProps {
  events: Awaited<ReturnType<typeof getEventsNotByCreator>>;
  series: Awaited<ReturnType<typeof getSeriesNotByCreator>>;
}

export function CommunityTab({ events, series }: CommunityTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Events</h2>
        {events.length === 0 ? (
          <EmptyState icon={CalendarDays} label="No events from others" />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={{
                ...event,
                badge: event.tag,
                churchName: event.church?.name ?? "",
              }}
            />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Series</h2>
        {series.length === 0 ? (
          <EmptyState icon={Repeat} label="No series from others" />
        ) : (
          series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="rounded-2xl border-0 bg-white py-0 shadow-card">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                      {s.createdBy?.name ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base font-bold leading-snug">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {CADENCE_LABELS[s.cadence] ?? s.cadence}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
