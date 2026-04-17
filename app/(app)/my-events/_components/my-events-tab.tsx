import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import type { getUserAttendedEvents, getUserAttendedPastEvents } from "@/lib/actions/data-events";

interface MyEventsTabProps {
  upcomingEvents: Awaited<ReturnType<typeof getUserAttendedEvents>>;
  pastEvents: Awaited<ReturnType<typeof getUserAttendedPastEvents>>;
}

export function MyEventsTab({ upcomingEvents, pastEvents }: MyEventsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Upcoming</h2>
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CalendarDays className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: event.series?.name }} />
          ))
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Past</h2>
        {pastEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CalendarDays className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No past events</p>
          </div>
        ) : (
          pastEvents.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: event.series?.name }} />
          ))
        )}
      </section>
    </div>
  );
}
