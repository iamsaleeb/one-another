import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Repeat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/lib/actions/data";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";

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
      <HeroBanner size="md" />

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
          <h1 className="text-xl font-bold leading-snug">{event.title}</h1>

          <div className="flex flex-col gap-4">
            <InfoField icon={User} label="Host">{event.host}</InfoField>
            <InfoField icon={Calendar} label="Date & Time">{event.datetime}</InfoField>
            <InfoField icon={MapPin} label="Location">{event.location}</InfoField>
            {event.series && (
              <InfoField icon={Repeat} label="Part of Series">
                <Link href={`/series/${event.series.id}`} className="text-primary hover:underline">
                  {event.series.name}
                </Link>
              </InfoField>
            )}
          </div>
        </div>

        {/* Tag label */}
        <p className="text-xs font-bold text-muted-foreground tracking-widest text-center uppercase">
          | {event.tag} |
        </p>

        {/* Description card */}
        <div className="rounded-2xl bg-white shadow-card p-5">
          <p className="text-sm text-foreground leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Register bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 py-4 bg-white shadow-[0px_-2px_31px_0px_#0000001A] flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Cost</p>
          <p className="text-base font-bold">Free Event</p>
        </div>
        <Button>
          Register
        </Button>
      </div>
    </div>
  );
}
