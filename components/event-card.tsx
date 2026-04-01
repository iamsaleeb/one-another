import Link from "next/link";
import Image from "next/image";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventDatetime } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    datetime: Date;
    title: string;
    location: string;
    host: string;
    tag: string;
    badge: string;
    cancelledAt?: Date | null;
    isDraft?: boolean;
    seriesName?: string | null;
    photoUrl?: string | null;
  };
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="rounded-2xl border-0 bg-white py-0 shadow-card overflow-hidden">
        <div className="flex flex-col">
          {event.photoUrl && (
            <div className="relative w-full h-44">
              <Image
                src={event.photoUrl}
                alt=""
                fill
                loading="eager"
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <CardContent className="flex flex-col gap-1 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {formatEventDatetime(event.datetime)}
            </p>
            {event.isDraft ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 whitespace-nowrap">
                Draft
              </span>
            ) : event.cancelledAt ? (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive whitespace-nowrap">
                Cancelled
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                {event.badge}
              </span>
            )}
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
        </div>
      </Card>
    </Link>
  );
}
