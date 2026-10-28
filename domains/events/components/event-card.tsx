import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EventDatetime } from "./event-datetime";
import { LiveBadge } from "./live-badge";
import { TAG_COLORS, type Category } from "@/lib/types/search";

interface EventCardProps {
  event: {
    id: string;
    datetime: Date | null;
    endDatetime: Date | null;
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
  saveButton?: React.ReactNode;
}

export function EventCard({
  event,
  priority = false,
  saveButton,
}: EventCardProps) {
  return (
    <div className="relative">
      <Link href={`/events/${event.id}`}>
        <Card className="overflow-hidden py-0">
          <div className="flex flex-col">
            {event.photoUrl && (
              <div className="relative h-44 w-full">
                <Image
                  src={event.photoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={priority}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8e+/+fwAI9AN2hc9PNgAAAABJRU5ErkJggg=="
                />
              </div>
            )}
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between">
                <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                  <EventDatetime datetime={event.datetime} />
                </p>
                {event.isDraft ? (
                  <Badge variant="warning">Draft</Badge>
                ) : event.cancelledAt ? (
                  <Badge className="bg-destructive/10 text-destructive">
                    Cancelled
                  </Badge>
                ) : (
                  // A Live Event shows "Live" in place of its Category.
                  <LiveBadge
                    event={{
                      isDraft: false,
                      datetime: event.datetime,
                      endDatetime: event.endDatetime,
                    }}
                  >
                    {(() => {
                      const colors = TAG_COLORS[event.tag as Category];
                      return (
                        <Badge
                          variant="soft"
                          className={colors && `${colors.bg} ${colors.text}`}
                        >
                          {event.badge}
                        </Badge>
                      );
                    })()}
                  </LiveBadge>
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
      {saveButton && (
        <div className="absolute right-3 bottom-3 z-10">{saveButton}</div>
      )}
    </div>
  );
}
