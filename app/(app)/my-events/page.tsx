import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getEvents, getPastEvents } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";

export default async function MyEventsPage() {
  const [upcomingEvents, pastEvents] = await Promise.all([
    getEvents(),
    getPastEvents(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Events"
        description={`${upcomingEvents.length} upcoming`}
        actions={
          <Button size="icon" className="rounded-full size-9">
            <Plus className="size-4" />
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Upcoming */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Upcoming</h2>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: event.series?.name }} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No upcoming events
            </p>
          )}
        </section>

        {/* Past */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Past</h2>
          {pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: event.series?.name }} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No past events
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
