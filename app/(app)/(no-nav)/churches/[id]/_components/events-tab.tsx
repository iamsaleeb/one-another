import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import type { getChurchById } from "@/lib/actions/data-churches";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface EventsTabProps {
  events: ChurchWithDetails["events"];
  churchName: string;
}

export function EventsTab({ events, churchName }: EventsTabProps) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3">Upcoming Events</h2>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} label="No upcoming events" className="py-10" />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={{ ...event, badge: event.tag, churchName }} />
          ))}
        </div>
      )}
    </div>
  );
}
