import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  event: {
    id: string;
    datetime: string;
    title: string;
    location: string;
    host: string;
    tag: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="rounded-2xl border-0 bg-white py-0 shadow-[4px_4px_10px_0px_#E8E8E866]">
        <CardContent className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {event.datetime}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
              {event.tag}
            </span>
          </div>
          <p className="text-base font-bold leading-snug">{event.title}</p>
          <p className="text-sm text-muted-foreground">{event.location}</p>
          <p className="text-sm text-muted-foreground">{event.host}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
