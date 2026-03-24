import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Pencil, Repeat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getEventById } from "@/lib/actions/data";
import { isOrganiserForChurch } from "@/lib/permissions";
import { formatEventDatetime } from "@/lib/utils";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";
import { DeleteEventButton } from "./_components/delete-event-button";
import { EventActionBar } from "./_components/event-action-bar";

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
  const [event, session] = await Promise.all([getEventById(id), auth()]);

  if (!event) notFound();

  const isOrganiser =
    session?.user?.role === UserRole.ORGANISER &&
    !!(await isOrganiserForChurch(session?.user?.id, event.churchId));

  const isAttending = session?.user?.id
    ? event.attendees.some((a) => a.userId === session.user.id)
    : false;

  return (
    <div className="bg-background">
      <HeroBanner size="md" />

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
            {isOrganiser && (
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="icon" className="size-9">
                  <Link href={`/events/${id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteEventButton eventId={id} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <InfoField icon={User} label="Host">{event.host}</InfoField>
            <InfoField icon={Calendar} label="Date & Time">{formatEventDatetime(event.datetime)}</InfoField>
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

      <EventActionBar
        eventId={event.id}
        eventTitle={event.title}
        requiresRegistration={event.requiresRegistration}
        isAttending={isAttending}
        userName={session?.user?.name ?? ""}
        userEmail={session?.user?.email ?? ""}
        capacity={event.capacity}
        spotsUsed={event._count.attendees}
        collectPhone={event.collectPhone}
        collectNotes={event.collectNotes}
      />
    </div>
  );
}
