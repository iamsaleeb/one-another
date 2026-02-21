import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, MapPin, Plus } from "lucide-react";

const events = [
  {
    title: "Sunday Worship Service",
    church: "Grace Community Church",
    date: "Sun, Feb 23",
    time: "10:00 AM",
    location: "Main Sanctuary",
    status: "upcoming",
  },
  {
    title: "Prayer Group",
    church: "New Life Fellowship",
    date: "Wed, Feb 26",
    time: "7:00 PM",
    location: "Room 204",
    status: "upcoming",
  },
  {
    title: "Youth Bible Study",
    church: "Grace Community Church",
    date: "Fri, Feb 28",
    time: "6:30 PM",
    location: "Youth Hall",
    status: "upcoming",
  },
  {
    title: "Community Outreach",
    church: "Harvest Church",
    date: "Sat, Mar 1",
    time: "9:00 AM",
    location: "Downtown Park",
    status: "upcoming",
  },
];

export default function MyEventsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 pt-5 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {events.length} upcoming events
          </p>
        </div>
        <Button size="icon" className="rounded-full size-9">
          <Plus className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-3 px-4 py-2">
        {events.map((event) => (
          <Card
            key={event.title}
            className="rounded-2xl border-0 bg-muted/40 shadow-sm"
          >
            <CardContent className="flex gap-4 p-4">
              {/* Date badge */}
              <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 py-2">
                <CalendarDays className="size-4 text-primary" />
                <p className="mt-1 text-[10px] font-bold leading-tight text-primary text-center">
                  {event.date.split(",")[1]?.trim() ?? event.date}
                </p>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-semibold truncate">{event.title}</p>
                <p className="text-xs text-primary font-medium truncate">
                  {event.church}
                </p>
                <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3 shrink-0" />
                    {event.date} · {event.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 shrink-0" />
                    {event.location}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
