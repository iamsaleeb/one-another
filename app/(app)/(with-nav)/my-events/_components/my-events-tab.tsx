import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
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
          <EmptyState icon={CalendarDays} label="No upcoming events" />
        ) : (
          upcomingEvents.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag, churchName: event.church?.name ?? "" }} />
          ))
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Past</h2>
        {pastEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} label="No past events" />
        ) : (
          pastEvents.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag, churchName: event.church?.name ?? "" }} />
          ))
        )}
      </section>
    </div>
  );
}
