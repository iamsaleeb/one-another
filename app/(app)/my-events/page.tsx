import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getEvents, getPastEvents } from "@/lib/actions/data";

export default async function MyEventsPage() {
  const [upcomingEvents, pastEvents] = await Promise.all([
    getEvents(),
    getPastEvents(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 pt-5 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {upcomingEvents.length} upcoming
          </p>
        </div>
        <Button size="icon" className="rounded-full size-9">
          <Plus className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Upcoming */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Upcoming</h2>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
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
              <EventCard key={event.id} event={event} />
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
