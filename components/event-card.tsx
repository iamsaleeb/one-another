import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { EventDatetime } from "@/components/event-datetime";
import { TAG_COLORS, type Category } from "@/types/search";

interface EventCardProps {
  event: {
    id: string;
    datetime: Date | null;
    title: string;
    churchName: string;
    host: string | null;
    tag: string;
    badge: string;
    cancelledAt?: Date | null;
    isDraft?: boolean;
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
className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <CardContent className="flex flex-col gap-1 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              <EventDatetime datetime={event.datetime} />
            </p>
            {event.isDraft ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 whitespace-nowrap">
                Draft
              </span>
            ) : event.cancelledAt ? (
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive whitespace-nowrap">
                Cancelled
              </span>
            ) : (() => {
              const colors = TAG_COLORS[event.tag as Category] ?? { bg: "bg-primary/10", text: "text-primary" };
              return (
                <span className={`rounded-full ${colors.bg} px-2.5 py-1 text-xs font-medium ${colors.text} whitespace-nowrap`}>
                  {event.badge}
                </span>
              );
            })()}
          </div>
          <p className="text-lg font-bold leading-snug">{event.title}</p>
          <p className="text-sm font-semibold text-muted-foreground">{event.churchName}</p>
          <p className="text-sm text-muted-foreground">{event.host ?? "TBD"}</p>
        </CardContent>
        </div>
      </Card>
    </Link>
  );
}
