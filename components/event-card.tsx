import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  event: {
    id: string;
    datetime: string;
    title: string;
    location: string;
    host: string;
    tag: string;
    badge: string;
    seriesName?: string | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="rounded-2xl border-0 bg-white py-0 shadow-card">
        <CardContent className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.datetime}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
              {event.badge}
            </span>
          </div>
          <p className="text-base font-bold leading-snug">{event.title}</p>
          {event.seriesName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Repeat className="size-3 shrink-0" />
              {event.seriesName}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{event.location}</p>
          <p className="text-sm text-muted-foreground">{event.host}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
