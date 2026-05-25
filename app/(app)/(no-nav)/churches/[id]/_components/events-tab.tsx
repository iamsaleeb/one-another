import { CalendarDays } from "lucide-react";
import { EventCard } from "@/domains/events/components/event-card";
import { EmptyState } from "@/components/empty-state";
import type { getChurchById } from "@/domains/churches/actions/data";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface EventsTabProps {
  events: ChurchWithDetails["events"];
  churchName: string;
}

export function EventsTab({ events, churchName }: EventsTabProps) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold">Upcoming Events</h2>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          label="No upcoming events"
          className="py-10"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={{ ...event, badge: event.tag, churchName }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
