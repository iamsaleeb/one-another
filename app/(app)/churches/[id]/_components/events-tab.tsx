import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import type { getChurchById } from "@/lib/actions/data-churches";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface EventsTabProps {
  events: ChurchWithDetails["events"];
}

export function EventsTab({ events }: EventsTabProps) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Upcoming Events</h2>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag }} />
          ))}
        </div>
      )}
    </div>
  );
}
