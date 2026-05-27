import type { getEvents } from "../actions/data";
import { EventCard } from "./event-card";

type Event = Awaited<ReturnType<typeof getEvents>>[number];

export function EventList({ events }: { events: Event[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Upcoming Events</h2>
      {events.map((item) => (
        <EventCard
          key={item.id}
          event={{
            ...item,
            badge: item.tag,
            churchName: item.church?.name ?? "",
          }}
        />
      ))}
    </section>
  );
}
