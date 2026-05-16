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
  priority?: boolean;
}

export function EventCard({ event, priority = false }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="shadow-card overflow-hidden rounded-2xl border-0 bg-white py-0">
        <div className="flex flex-col">
          {event.photoUrl && (
            <div className="relative h-44 w-full">
              <Image
                src={event.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={priority}
              />
            </div>
          )}
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                <EventDatetime datetime={event.datetime} />
              </p>
              {event.isDraft ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-amber-700">
                  Draft
                </span>
              ) : event.cancelledAt ? (
                <span className="bg-destructive/10 text-destructive rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                  Cancelled
                </span>
              ) : (
                (() => {
                  const colors = TAG_COLORS[event.tag as Category] ?? {
                    bg: "bg-primary/10",
                    text: "text-primary",
                  };
                  return (
                    <span
                      className={`rounded-full ${colors.bg} px-2.5 py-1 text-xs font-medium ${colors.text} whitespace-nowrap`}
                    >
                      {event.badge}
                    </span>
                  );
                })()
              )}
            </div>
            <p className="text-lg leading-snug font-bold">{event.title}</p>
            <p className="text-muted-foreground text-sm font-semibold">
              {event.churchName}
            </p>
            <p className="text-muted-foreground text-sm">
              {event.host ?? "TBD"}
            </p>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
