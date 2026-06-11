import { CalendarDays } from "lucide-react";
import { EventCard } from "@/domains/events/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { SaveEventButton } from "@/domains/events/components/save-event-button";
import type { getChurchById } from "@/domains/churches/actions/data";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface EventsTabProps {
  events: ChurchWithDetails["events"];
  churchName: string;
  isAuthenticated: boolean;
}

export function EventsTab({
  events,
  churchName,
  isAuthenticated,
}: EventsTabProps) {
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
              saveButton={
                <SaveEventButton
                  eventId={event.id}
                  initialSaved={false}
                  isAuthenticated={isAuthenticated}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
