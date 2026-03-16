import { notFound } from "next/navigation";
import { Calendar, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/lib/actions/data";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? `${event.title} — One Another` : "Event Not Found" };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  return (
    <div className="bg-background">

        {/* Hero banner */}
        <div className="relative w-full h-52 bg-gradient-to-br from-primary/80 via-primary to-primary/60">
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute top-6 right-12 w-20 h-20 rounded-full bg-white/10" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 px-4 pt-5 pb-6">

          {/* Info card */}
          <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] p-5 flex flex-col gap-4">
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">Host</p>
                  <p className="text-sm font-semibold">{event.host}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="text-sm font-semibold">{event.datetime}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold">{event.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tag label */}
          <p className="text-xs font-bold text-muted-foreground tracking-widest text-center uppercase">
            | {event.tag} |
          </p>

          {/* Description card */}
          <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] p-5">
            <p className="text-sm text-foreground leading-relaxed">
              {event.description}
            </p>
          </div>
        </div>

      {/* Register bar */}
      <div className="sticky bottom-0 z-10 px-4 py-4 bg-white shadow-[0px_-2px_31px_0px_#0000001A] flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Cost</p>
          <p className="text-base font-bold">Free Event</p>
        </div>
        <Button className="h-12 px-8 text-base font-semibold rounded-xl">
          Register
        </Button>
      </div>

    </div>
  );
}
